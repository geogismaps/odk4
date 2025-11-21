import { supabase } from './supabase';
import type { Database } from './database.types';

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type SubmissionRow = Database['public']['Tables']['submissions']['Row'];

export async function syncSubmissionToTeable(
  submissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select(`
        *,
        forms (
          *,
          projects (*)
        ),
        users (
          username,
          email
        )
      `)
      .eq('id', submissionId)
      .maybeSingle();

    if (submissionError) throw submissionError;
    if (!submission) throw new Error('Submission not found');

    const form = (submission as any).forms;
    const project = form?.projects as ProjectRow;
    const user = (submission as any).users;

    if (!project.teable_base_url || !project.teable_api_token || !project.teable_table_id) {
      return { success: false, error: 'Teable not configured for this project' };
    }

    const submissionData = submission.data as Record<string, any>;

    const record: Record<string, any> = {
      'Submission ID': submission.id,
      'Submitted By': user?.username || 'Unknown',
      'Submitted At': new Date(submission.created_at).toISOString(),
    };

    Object.entries(submissionData).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.latitude !== undefined) {
          record[key] = `${value.latitude}, ${value.longitude}`;
        } else {
          record[key] = JSON.stringify(value);
        }
      } else {
        record[key] = value;
      }
    });

    console.log('Syncing to Teable:', {
      url: `${project.teable_base_url}/api/table/${project.teable_table_id}/record`,
      record,
    });

    const response = await fetch(
      `${project.teable_base_url}/api/table/${project.teable_table_id}/record`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.teable_api_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{ fields: record }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Teable API error:', errorText);
      throw new Error(`Teable sync failed: ${errorText}`);
    }

    const data = await response.json();
    console.log('Teable sync success:', data);

    const recordId = data.records?.[0]?.id || data.id;

    await supabase
      .from('submissions')
      .update({
        synced_to_teable: true,
        teable_record_id: recordId,
        sync_error: null,
      })
      .eq('id', submissionId);

    return { success: true };
  } catch (error: any) {
    console.error('Teable sync error:', error);

    await supabase
      .from('submissions')
      .update({
        synced_to_teable: false,
        sync_error: error.message || 'Unknown error',
      })
      .eq('id', submissionId);

    return { success: false, error: error.message };
  }
}

export async function syncAllPendingSubmissions(projectId?: string): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  try {
    let query = supabase
      .from('submissions')
      .select('id')
      .eq('synced_to_teable', false);

    if (projectId) {
      query = query.in('form_id', [
        supabase
          .from('forms')
          .select('id')
          .eq('project_id', projectId)
      ]);
    }

    const { data: submissions, error } = await query;

    if (error) throw error;

    const results = await Promise.allSettled(
      submissions.map((sub) => syncSubmissionToTeable(sub.id))
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    return {
      total: submissions.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error('Bulk sync error:', error);
    return { total: 0, successful: 0, failed: 0 };
  }
}
