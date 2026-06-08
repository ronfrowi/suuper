'use client'

import { useState } from 'react'

interface Supermarket {
  id: string
  slug: string
  name: string
  active: boolean
}

interface Job {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  products_scraped: number
  triggered_by: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  errors: unknown[]
  supermarkets: { name: string; slug: string }
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  running:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-700',
}

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API_URL ?? 'http://localhost:3001'
const SCRAPER_SECRET = process.env.NEXT_PUBLIC_SCRAPER_API_SECRET ?? ''

function scraperFetch(path: string) {
  return fetch(`${SCRAPER_API}${path}`, {
    method: 'POST',
    headers: { 'x-api-secret': SCRAPER_SECRET },
  })
}

export default function JobsPanel({
  supermarkets,
  initialJobs,
}: {
  supermarkets: Supermarket[]
  initialJobs: Job[]
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [loading, setLoading] = useState<string | null>(null)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())

  async function triggerJob(slug: string) {
    setLoading(slug)
    try {
      const res = await scraperFetch(`/jobs/run/${slug}`)
      const data = await res.json()
      alert(`Job started: ${data.jobId}`)
    } catch (err) {
      alert(`Failed to trigger job: ${err}`)
    } finally {
      setLoading(null)
    }
  }

  async function triggerAll() {
    setLoading('all')
    try {
      const res = await scraperFetch('/jobs/run-all')
      const data = await res.json()
      alert(`All jobs queued for: ${data.supermarkets?.join(', ')}`)
    } catch (err) {
      alert(`Failed: ${err}`)
    } finally {
      setLoading(null)
    }
  }

  function toggleErrors(jobId: string) {
    setExpandedErrors(prev => {
      const next = new Set(prev)
      next.has(jobId) ? next.delete(jobId) : next.add(jobId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={triggerAll}
            disabled={loading === 'all'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {loading === 'all' ? 'Iniciando...' : 'Run All'}
          </button>

          {supermarkets.map(sm => (
            <button
              key={sm.slug}
              onClick={() => triggerJob(sm.slug)}
              disabled={!sm.active || loading === sm.slug}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              {loading === sm.slug ? '...' : sm.name}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Supermercado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Productos</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Trigger</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Creado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Duración</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map(job => {
              const duration = job.started_at && job.completed_at
                ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                : null
              const errors = Array.isArray(job.errors) ? job.errors : []

              return (
                <>
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{job.supermarkets?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? ''}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{job.products_scraped.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{job.triggered_by}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(job.created_at).toLocaleString('es-CR')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {duration != null ? `${duration}s` : '—'}
                      {errors.length > 0 && (
                        <button
                          onClick={() => toggleErrors(job.id)}
                          className="ml-2 text-red-500 text-xs underline"
                        >
                          {errors.length} error{errors.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedErrors.has(job.id) && (
                    <tr key={`${job.id}-errors`}>
                      <td colSpan={6} className="px-4 py-3 bg-red-50">
                        <pre className="text-xs text-red-700 whitespace-pre-wrap">
                          {JSON.stringify(errors, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hay jobs recientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
