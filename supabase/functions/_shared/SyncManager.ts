import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

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
  needs_continuation: boolean;
}

export class SyncManager {
  private supabase: SupabaseClient;
  private type: string;
  
  constructor(supabaseUrlOrClient: string | SupabaseClient, supabaseKeyOrType?: string, type?: string) {
    if (typeof supabaseUrlOrClient === 'string' && typeof supabaseKeyOrType === 'string' && type) {
      // Old constructor format: (url, key, type)
      console.log(`Initializing SyncManager for ${type} with URL and key`);
      this.supabase = createClient(supabaseUrlOrClient, supabaseKeyOrType);
      this.type = type;
    } else if (typeof supabaseUrlOrClient !== 'string' && typeof supabaseKeyOrType === 'string') {
      // New constructor format: (client, type)
      console.log(`Initializing SyncManager for ${supabaseKeyOrType} with client`);
      this.supabase = supabaseUrlOrClient;
      this.type = supabaseKeyOrType;
    } else {
      throw new Error('Invalid parameters for SyncManager constructor');
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
      last_processed: data.last_processed,
      processed_items: data.processed_items || [],
      error_items: data.error_items || [],
      start_time: data.start_time,
      is_complete: data.is_complete,
      error_details: data.error_details,
      batch_metrics: data.batch_metrics,
      needs_continuation: data.needs_continuation
    };
  }

  async initialize(total: number, resume: boolean = false): Promise<void> {
    console.log(`Initializing sync progress for ${this.type}, resume: ${resume}`);
    
    // Only initialize if we're not resuming or there's no existing progress
    const currentProgress = await this.getCurrentProgress();
    if (currentProgress && resume) {
      console.log('Skipping initialization as we are resuming with existing progress');
      return;
    }
    
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
        },
        needs_continuation: false
      }, {
        onConflict: 'type'
      });

    if (error) {
      console.error(`Error initializing sync progress for ${this.type}:`, error);
      throw error;
    }
  }

  async updateProgress(updates: Partial<SyncState>): Promise<void> {
    console.log(`Updating progress for ${this.type}:`, updates);
    
    try {
      // Get current state to properly handle processed count and preserve total
      const currentState = await this.getCurrentProgress();
      if (!currentState) {
        console.error('No current state found when updating progress');
        return;
      }

      // Ensure processed count doesn't exceed total and preserve the total
      let processedCount = updates.processed ?? currentState.processed;
      if (processedCount > currentState.total) {
        console.warn(`Attempted to set processed count (${processedCount}) higher than total (${currentState.total}). Capping at total.`);
        processedCount = currentState.total;
      }

      // Handle array merging for processed_items and error_items
      const updatedProcessedItems = this.mergeArrayItems(
        currentState.processed_items || [], 
        updates.processed_items || []
      );
      
      const updatedErrorItems = this.mergeArrayItems(
        currentState.error_items || [], 
        updates.error_items || []
      );

      const { error } = await this.supabase
        .from('sync_progress')
        .update({
          ...updates,
          processed_items: updatedProcessedItems,
          error_items: updatedErrorItems,
          total: currentState.total, // Preserve the original total
          processed: processedCount,
          updated_at: new Date().toISOString()
        })
        .eq('type', this.type);

      if (error) {
        console.error(`Error updating progress for ${this.type}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Critical error in updateProgress for ${this.type}:`, error);
      // Continue execution without throwing to prevent cascade failures
    }
  }

  async incrementProgress(itemId: string): Promise<void> {
    console.log(`Incrementing progress for ${this.type} with item ${itemId}`);
    
    try {
      const currentState = await this.getCurrentProgress();
      if (!currentState) {
        console.error('No current state found when incrementing progress');
        return;
      }
      
      const updatedProcessedItems = this.mergeArrayItems(
        currentState.processed_items || [], 
        itemId
      );
      
      const { error } = await this.supabase
        .from('sync_progress')
        .update({
          processed: currentState.processed + 1,
          processed_items: updatedProcessedItems,
          last_processed: itemId,
          updated_at: new Date().toISOString()
        })
        .eq('type', this.type);

      if (error) {
        console.error(`Error incrementing progress for ${this.type}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Critical error in incrementProgress for ${this.type}:`, error);
      // Continue execution without throwing to prevent cascade failures
    }
  }

  async updateSyncState(updates: Partial<SyncState>): Promise<void> {
    console.log(`Updating sync state for ${this.type}:`, updates);
    return this.updateProgress(updates);
  }

  private mergeArrayItems(existingItems: string[], newItems: string[] | string): string[] {
    // Handle case where newItems is a single string
    if (typeof newItems === 'string') {
      return [...new Set([...existingItems, newItems])];
    }
    
    // Handle case where newItems is an array
    if (Array.isArray(newItems)) {
      return [...new Set([...existingItems, ...newItems])];
    }
    
    // If newItems is undefined or null, return existing items
    return existingItems;
  }

  async completeSync(): Promise<void> {
    console.log(`Marking sync ${this.type} as complete`);
    await this.updateProgress({ 
      is_complete: true,
      needs_continuation: false
    });
  }

  async continueSyncProgress(): Promise<void> {
    console.log(`Continuing sync ${this.type}`);
    const currentProgress = await this.getCurrentProgress();
    if (!currentProgress) {
      throw new Error(`No progress found for sync type ${this.type}`);
    }
    
    await this.updateProgress({
      needs_continuation: true,
      is_complete: false
    });
  }

  async getSyncProgress(): Promise<SyncState> {
    const progress = await this.getCurrentProgress();
    if (!progress) {
      throw new Error(`No progress found for sync type ${this.type}`);
    }
    return progress;
  }

  async clearSyncProgress(): Promise<void> {
    console.log(`Clearing sync progress for ${this.type}`);
    await this.initialize(0);
  }

  async cleanup(): Promise<void> {
    console.log(`Cleaning up sync ${this.type}`);
    const { error } = await this.supabase
      .from('sync_progress')
      .delete()
      .eq('type', this.type);
      
    if (error) {
      console.error(`Error cleaning up sync ${this.type}:`, error);
      throw error;
    }
  }
}
