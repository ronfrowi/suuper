import { createServiceClient } from '@/lib/supabase/server'
import JobsPanel from './JobsPanel'

export default async function AdminJobsPage() {
  const supabase = await createServiceClient()

  const [{ data: supermarkets }, { data: recentJobs }] = await Promise.all([
    supabase.from('supermarkets').select('id, slug, name, active').order('name'),
    supabase
      .from('scrape_jobs')
      .select(`
        *,
        supermarkets (name, slug)
      `)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scrape Jobs</h1>
      <JobsPanel
        supermarkets={supermarkets ?? []}
        initialJobs={recentJobs ?? []}
      />
    </div>
  )
}
