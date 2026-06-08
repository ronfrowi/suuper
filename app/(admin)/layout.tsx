import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service client to bypass RLS when reading the user role
  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-green-600">Suuper Admin</span>
        <a href="/admin" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
        <a href="/admin/jobs" className="text-sm text-gray-600 hover:text-gray-900">Jobs</a>
        <a href="/admin/matches" className="text-sm text-gray-600 hover:text-gray-900">Matches</a>
        <form action="/auth/signout" method="POST" className="ml-auto">
          <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">
            Salir
          </button>
        </form>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
