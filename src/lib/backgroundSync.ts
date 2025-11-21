import { supabase } from './supabase';
import { getPendingSubmissions, markSubmissionSynced, updateSubmissionSyncError, deleteSubmission } from './offlineStorage';
import { syncSubmissionToTeable } from './teableSync';

export async function syncPendingSubmissions(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const pending = await getPendingSubmissions();

    if (pending.length === 0) {
      return results;
    }

    console.log(`Syncing ${pending.length} pending submissions...`);

    for (const submission of pending) {
      try {
        if (submission.syncAttempts >= 5) {
          console.warn(`Submission ${submission.id} exceeded max sync attempts, skipping`);
          results.failed++;
          results.errors.push(`Submission ${submission.id}: Max sync attempts exceeded`);
          continue;
        }

        const { data, error } = await supabase
          .from('submissions')
          .upsert({
            id: submission.id,
            form_id: submission.formId,
            user_id: submission.userId,
            data: submission.data,
            created_at: new Date(submission.createdAt).toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        syncSubmissionToTeable(data.id).catch(err => {
          console.error('Teable sync failed for submission:', data.id, err);
        });

        await markSubmissionSynced(submission.id);
        await deleteSubmission(submission.id);
        results.success++;
        console.log(`Successfully synced submission ${submission.id}`);
      } catch (err) {
        console.error(`Failed to sync submission ${submission.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        await updateSubmissionSyncError(submission.id, errorMessage);
        results.failed++;
        results.errors.push(`Submission ${submission.id}: ${errorMessage}`);
      }
    }
  } catch (err) {
    console.error('Error in syncPendingSubmissions:', err);
    results.errors.push('Failed to get pending submissions');
  }

  return results;
}

export function registerSyncListener() {
  if (typeof window === 'undefined') return;

  let syncInProgress = false;

  const triggerSync = async () => {
    if (syncInProgress || !navigator.onLine) return;

    syncInProgress = true;
    try {
      const results = await syncPendingSubmissions();
      if (results.success > 0 || results.failed > 0) {
        console.log('Sync complete:', results);
        if (results.success > 0) {
          window.dispatchEvent(new CustomEvent('submissions-synced', { detail: results }));
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      syncInProgress = false;
    }
  };

  window.addEventListener('online', () => {
    console.log('App is online, triggering sync...');
    setTimeout(triggerSync, 1000);
  });

  const syncInterval = setInterval(() => {
    if (navigator.onLine) {
      triggerSync();
    }
  }, 60000);

  if (navigator.onLine) {
    setTimeout(triggerSync, 2000);
  }

  return () => {
    clearInterval(syncInterval);
  };
}
