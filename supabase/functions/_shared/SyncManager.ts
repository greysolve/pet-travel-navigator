import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export interface SyncState {
  total: number;
  processed: number;
  last_processed: string | null;
  processed_items: string[];
  error_items: string[];
  start_time: string | null;
  is_complete: boolean;
}

export class SyncManager {
  private supabase;
  private type: string;
  
  constructor(supabaseUrl: string, supabaseKey: string, type: string) {
    console.log(`Initializing SyncManager for ${type}`);
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.type = type;
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
      is_complete: data.is_complete
    };
  }

  async initialize(total: number): Promise<void> {
    console.log(`Initializing sync progress for ${this.type} with total: ${total}`);
    
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
        is_complete: false
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
    
    const { error } = await this.supabase
      .from('sync_progress')
      .upsert({
        type: this.type,
        ...updates,
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

    await this.updateProgress({
      error_items: [...current.error_items, `${item}: ${error}`]
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