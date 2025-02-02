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

  async completeSync(): Promise<void> {
    console.log(`Completing sync for ${this.type}`);
    
    const { error } = await this.supabase
      .from('sync_progress')
      .delete()
      .eq('type', this.type);

    if (error) {
      console.error(`Error completing sync for ${this.type}:`, error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up sync progress for ${this.type}`);
    
    const { error } = await this.supabase
      .from('sync_progress')
      .delete()
      .eq('type', this.type);

    if (error) {
      console.error(`Error cleaning up sync progress for ${this.type}:`, error);
      throw error;
    }
  }
}