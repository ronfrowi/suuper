import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { runScrapeJob, startScheduler } from './scheduler'

const app = express()
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }))
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
)

// ── Auth middleware ────────────────────────────────────────────────────────────
// All mutating routes require the shared secret in the x-api-secret header.
// GET /health and GET /jobs/:id are intentionally public (safe read-only).
const SCRAPER_SECRET = process.env.SCRAPER_API_SECRET

function requireSecret(req: Request, res: Response, next: NextFunction) {
  if (!SCRAPER_SECRET) {
    // Secret not configured — block all requests to fail safe
    res.status(503).json({ error: 'SCRAPER_API_SECRET not configured on server' })
    return
  }
  if (req.headers['x-api-secret'] !== SCRAPER_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// Health check — public
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Trigger scrape for a single supermarket
app.post('/jobs/run/:slug', requireSecret, async (req, res) => {
  const { slug } = req.params

  const { data: supermarket, error } = await supabase
    .from('supermarkets')
    .select('id, slug, name')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !supermarket) {
    return res.status(404).json({ error: `Supermarket not found: ${slug}` })
  }

  try {
    const jobId = await runScrapeJob(supermarket.id, supermarket.slug, 'manual')
    res.json({ jobId, supermarket: slug, status: 'started' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Trigger all supermarkets sequentially
app.post('/jobs/run-all', requireSecret, async (_req, res) => {
  const { data: supermarkets, error } = await supabase
    .from('supermarkets')
    .select('id, slug, name')
    .eq('active', true)

  if (error || !supermarkets) {
    return res.status(500).json({ error: 'Failed to fetch supermarkets' })
  }

  // Fire-and-forget; run sequentially in background
  const jobIds: string[] = [];
  (async () => {
    for (const sm of supermarkets) {
      try {
        const jobId = await runScrapeJob(sm.id, sm.slug, 'manual')
        jobIds.push(jobId)
      } catch (err) {
        console.error(`run-all: failed for ${sm.slug}:`, err)
      }
    }
  })()

  res.json({ message: 'All scrape jobs queued', supermarkets: supermarkets.map(s => s.slug) })
})

// Get job status
app.get('/jobs/:id', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Job not found' })
  }

  res.json(data)
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`Suuper scraper service running on port ${PORT}`)
  startScheduler()
})
