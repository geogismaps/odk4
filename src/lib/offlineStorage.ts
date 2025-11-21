import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Database } from './database.types';

type FormRow = Database['public']['Tables']['forms']['Row'];
type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

interface OfflineDB extends DBSchema {
  forms: {
    key: string;
    value: {
      id: string;
      projectId: string;
      name: string;
      xmlContent: string;
      version: string;
      fields: any[];
      downloadedAt: number;
    };
    indexes: { 'by-project': string };
  };
  submissions: {
    key: string;
    value: {
      id: string;
      formId: string;
      userId: string | null;
      data: any;
      createdAt: number;
      synced: boolean;
      syncAttempts: number;
      lastSyncError?: string;
    };
    indexes: { 'by-form': string; 'by-sync-status': number };
  };
  formProgress: {
    key: string;
    value: {
      formId: string;
      data: any;
      lastSaved: number;
    };
  };
}

let dbInstance: IDBPDatabase<OfflineDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDB>('data-collection-offline', 1, {
    upgrade(db) {
      const formStore = db.createObjectStore('forms', { keyPath: 'id' });
      formStore.createIndex('by-project', 'projectId');

      const submissionStore = db.createObjectStore('submissions', { keyPath: 'id' });
      submissionStore.createIndex('by-form', 'formId');
      submissionStore.createIndex('by-sync-status', 'synced');

      db.createObjectStore('formProgress', { keyPath: 'formId' });
    },
  });

  return dbInstance;
}

export async function saveFormOffline(
  form: FormRow,
  fields: any[]
): Promise<void> {
  const db = await getDB();
  await db.put('forms', {
    id: form.id,
    projectId: form.project_id,
    name: form.name,
    xmlContent: form.xml_content,
    version: form.version,
    fields,
    downloadedAt: Date.now(),
  });
}

export async function getOfflineForm(formId: string): Promise<{
  id: string;
  projectId: string;
  name: string;
  xmlContent: string;
  version: string;
  fields: any[];
  downloadedAt: number;
} | undefined> {
  const db = await getDB();
  return await db.get('forms', formId);
}

export async function getAllOfflineForms(): Promise<
  Array<{
    id: string;
    projectId: string;
    name: string;
    xmlContent: string;
    version: string;
    fields: any[];
    downloadedAt: number;
  }>
> {
  const db = await getDB();
  return await db.getAll('forms');
}

export async function getOfflineFormsByProject(projectId: string) {
  const db = await getDB();
  return await db.getAllFromIndex('forms', 'by-project', projectId);
}

export async function deleteOfflineForm(formId: string): Promise<void> {
  const db = await getDB();
  await db.delete('forms', formId);
}

export async function queueSubmission(
  submission: Omit<SubmissionRow, 'created_at' | 'synced_at'>
): Promise<void> {
  const db = await getDB();
  await db.put('submissions', {
    id: submission.id,
    formId: submission.form_id,
    userId: submission.user_id,
    data: submission.data,
    createdAt: Date.now(),
    synced: false,
    syncAttempts: 0,
  });
}

export async function getPendingSubmissions(): Promise<
  Array<{
    id: string;
    formId: string;
    userId: string | null;
    data: any;
    createdAt: number;
    synced: boolean;
    syncAttempts: number;
    lastSyncError?: string;
  }>
> {
  const db = await getDB();
  return await db.getAllFromIndex('submissions', 'by-sync-status', 0);
}

export async function markSubmissionSynced(submissionId: string): Promise<void> {
  const db = await getDB();
  const submission = await db.get('submissions', submissionId);
  if (submission) {
    submission.synced = true;
    await db.put('submissions', submission);
  }
}

export async function updateSubmissionSyncError(
  submissionId: string,
  error: string
): Promise<void> {
  const db = await getDB();
  const submission = await db.get('submissions', submissionId);
  if (submission) {
    submission.syncAttempts += 1;
    submission.lastSyncError = error;
    await db.put('submissions', submission);
  }
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const db = await getDB();
  await db.delete('submissions', submissionId);
}

export async function saveFormProgress(formId: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('formProgress', {
    formId,
    data,
    lastSaved: Date.now(),
  });
}

export async function getFormProgress(formId: string): Promise<{
  formId: string;
  data: any;
  lastSaved: number;
} | undefined> {
  const db = await getDB();
  return await db.get('formProgress', formId);
}

export async function clearFormProgress(formId: string): Promise<void> {
  const db = await getDB();
  await db.delete('formProgress', formId);
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usageInMB: string;
  quotaInMB: string;
  percentUsed: string;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    return {
      usage,
      quota,
      usageInMB: (usage / (1024 * 1024)).toFixed(2),
      quotaInMB: (quota / (1024 * 1024)).toFixed(2),
      percentUsed: quota > 0 ? ((usage / quota) * 100).toFixed(2) : '0',
    };
  }
  return {
    usage: 0,
    quota: 0,
    usageInMB: '0',
    quotaInMB: '0',
    percentUsed: '0',
  };
}

export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  await db.clear('forms');
  await db.clear('submissions');
  await db.clear('formProgress');
}
