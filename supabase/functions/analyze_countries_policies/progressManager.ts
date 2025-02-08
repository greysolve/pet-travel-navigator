
import { SyncManager } from '../_shared/SyncManager.ts';

export async function validateAndInitializeProgress(
  syncManager: SyncManager,
  totalCount: number,
  offset: number,
  resumeToken: string | null
): Promise<void> {
  if (resumeToken) {
    const currentProgress = await syncManager.getCurrentProgress();
    if (!currentProgress?.needs_continuation) {
      throw new Error('Invalid resume token or no continuation needed');
    }
    console.log('Resuming from previous state:', currentProgress);
  } else if (offset === 0) {
    console.log(`Initializing sync progress with total count: ${totalCount}`);
    await syncManager.initialize(totalCount);
  } else {
    const currentProgress = await syncManager.getCurrentProgress();
    if (!currentProgress) {
      throw new Error('No sync progress found for non-zero offset');
    }
  }
}
