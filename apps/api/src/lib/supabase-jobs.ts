import { supabase_service } from "../services/supabase";

export const supabaseGetJobById = async (jobId: string) => {
  const { data, error } = await supabase_service
    .from('firecrawl_jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (error) {
    return null;
  }

  if (!data) {
    return null;
  }

  return data;
}

export const supabaseGetJobsById = async (jobIds: string[]) => {
  const { data, error } = await supabase_service
    .from('firecrawl_jobs')
    .select('*')
    .in('job_id', jobIds);

  if (error) {
    return [];
  }

  if (!data) {
    return [];
  }

  return data;
}

