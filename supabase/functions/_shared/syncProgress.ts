import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

export interface SyncState {
  total: number;
  processed: number;
  lastProcessed: string | null;
  processedItems: string[];
  errorItems: string[];
  startTime: string | null;
  isComplete: boolean;
}

export class SyncProgressManager {
  private supabase;
  private type: string;
  
  constructor(supabaseUrl: string, supabaseKey: string, type: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.type = type;
  }

  async initialize(total: number, resume: boolean = false): Promise<void> {
    console.log(`Initializing sync progress for ${this.type}, resume: ${resume}`);
    
    if (!resume) {
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
      lastProcessed: data.last_processed,
      processedItems: data.processed_items || [],
      errorItems: data.error_items || [],
      startTime: data.start_time,
      isComplete: data.is_complete
    };
  }

  async updateProgress(updates: Partial<SyncState>): Promise<void> {
    console.log(`Updating progress for ${this.type}:`, updates);
    
    const { error } = await this.supabase
      .from('sync_progress')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('type', this.type);

    if (error) {
      console.error(`Error updating progress for ${this.type}:`, error);
      throw error;
    }
  }

  async markComplete(): Promise<void> {
    console.log(`Marking sync complete for ${this.type}`);
    
    const { error } = await this.supabase
      .from('sync_progress')
      .update({ 
        is_complete: true,
        updated_at: new Date().toISOString()
      })
      .eq('type', this.type);

    if (error) {
      console.error(`Error marking sync complete for ${this.type}:`, error);
      throw error;
    }
  }

  async addProcessedItem(item: string): Promise<void> {
    const current = await this.getCurrentProgress();
    if (!current) return;

    await this.updateProgress({
      processed: current.processed + 1,
      processedItems: [...current.processedItems, item],
      lastProcessed: item
    });
  }

  async addErrorItem(item: string): Promise<void> {
    const current = await this.getCurrentProgress();
    if (!current) return;

    await this.updateProgress({
      errorItems: [...current.errorItems, item]
    });
  }
}