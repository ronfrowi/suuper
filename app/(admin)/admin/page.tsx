import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ data: jobs }, { data: supermarkets }, { data: pendingMatches }] = await Promise.all([
    supabase
      .from('scrape_jobs')
      .select('status')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabase.from('supermarkets').select('id, name, active'),
    supabase.from('product_matches').select('id', { count: 'exact', head: true }).eq('confirmed', false),
  ])

  const statusCounts = (jobs ?? []).reduce(
    (acc, j) => { acc[j.status] = (acc[j.status] ?? 0) + 1; return acc },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['completed', 'running', 'failed', 'pending'] as const).map(s => (
          <div key={s} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500 capitalize">{s}</p>
            <p className="text-3xl font-bold mt-1">{statusCounts[s] ?? 0}</p>
            <p className="text-xs text-gray-400">jobs (last 24h)</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold mb-3">Matches sin confirmar</h2>
        <p className="text-3xl font-bold text-amber-600">
          {(pendingMatches as unknown as { count: number } | null)?.count ?? 0}
        </p>
        <a href="/admin/matches" className="text-sm text-green-600 hover:underline mt-2 inline-block">
          Revisar matches →
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold mb-3">Supermercados activos</h2>
        <div className="flex flex-wrap gap-2">
          {supermarkets?.map(sm => (
            <span
              key={sm.id}
              className={`px-3 py-1 rounded-full text-sm ${sm.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
            >
              {sm.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
