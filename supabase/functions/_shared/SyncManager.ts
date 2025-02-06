
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export interface SyncState {
  total: number;
  processed: number;
  last_processed: string | null;
  processed_items: string[];
  error_items: string[];
  start_time: string | null;
  is_complete: boolean;
  error_details?: { [key: string]: string };
  batch_metrics?: {
    avg_time_per_item: number;
    estimated_time_remaining: number;
    success_rate: number;
  };
}

export class SyncManager {
  private supabase;
  private type: string;
  private startTime: number;
  
  constructor(supabaseUrl: string, supabaseKey: string, type: string) {
    console.log(`Initializing SyncManager for ${type}`);
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.type = type;
    this.startTime = Date.now();
  }

  async getCurrentProgress(): Promise<SyncState | null> {
    console.log(`Fetching current progress for ${this.type}`);
    
    const { data, error } = await this.supabase
      .from('sync_progress')
      .select('*')
      .eq('type', this.type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error(`Error fetching progress for ${this.type}:`, error);
      throw error;
    }

    return {
      total: data.total,
      processed: data.processed,
      last_processed: data.last_processed,
      processed_items: data.processed_items || [],
      error_items: data.error_items || [],
      start_time: data.start_time,
      is_complete: data.is_complete,
      error_details: data.error_details,
      batch_metrics: data.batch_metrics
    };
  }

  async initialize(total: number): Promise<void> {
    console.log(`Initializing sync progress for ${this.type} with total: ${total}`);
    this.startTime = Date.now();
    
    const { error } = await this.supabase
      .from('sync_progress')
      .upsert({
        type: this.type,
        total,
        processed: 0,
        last_processed: null,
        processed_items: [],
        error_items: [],
        start_time: new Date().toISOString(),
        is_complete: false,
        error_details: {},
        batch_metrics: {
          avg_time_per_item: 0,
          estimated_time_remaining: 0,
          success_rate: 100
        }
      }, {
        onConflict: 'type'
      });

    if (error) {
      console.error(`Error initializing sync progress for ${this.type}:`, error);
      throw error;
    }
  }

  async updateProgress(updates: Partial<SyncState>): Promise<void> {
    console.log(`Updating sync progress for ${this.type}:`, updates);
    
    const current = await this.getCurrentProgress();
    if (!current) throw new Error('No sync progress found');

    const elapsed = Date.now() - this.startTime;
    const avgTimePerItem = current.processed > 0 ? elapsed / current.processed : 0;
    const successRate = current.processed > 0 
      ? ((current.processed - current.error_items.length) / current.processed) * 100 
      : 100;
    const remainingItems = current.total - current.processed;
    
    const batchMetrics = {
      avg_time_per_item: avgTimePerItem,
      estimated_time_remaining: avgTimePerItem * remainingItems,
      success_rate: successRate
    };

    const { error } = await this.supabase
      .from('sync_progress')
      .upsert({
        type: this.type,
        ...updates,
        batch_metrics: batchMetrics,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'type'
      });

    if (error) {
      console.error(`Error updating sync progress for ${this.type}:`, error);
      throw error;
    }
  }

  async addProcessedItem(item: string): Promise<void> {
    console.log(`Adding processed item for ${this.type}:`, item);
    const current = await this.getCurrentProgress();
    if (!current) throw new Error('No sync progress found');

    await this.updateProgress({
      processed: current.processed + 1,
      last_processed: item,
      processed_items: [...current.processed_items, item]
    });
  }

  async addErrorItem(item: string, error: string): Promise<void> {
    console.log(`Adding error item for ${this.type}:`, { item, error });
    const current = await this.getCurrentProgress();
    if (!current) throw new Error('No sync progress found');

    const errorDetails = {
      ...(current.error_details || {}),
      [item]: error
    };

    await this.updateProgress({
      error_items: [...current.error_items, item],
      error_details: errorDetails
    });
  }

  async complete(): Promise<void> {
    console.log(`Completing sync for ${this.type}`);
    await this.updateProgress({
      is_complete: true
    });
  }

  async shouldProcessItem(item: string): Promise<boolean> {
    const current = await this.getCurrentProgress();
    if (!current) return true;
    return !current.processed_items.includes(item);
  }
}
