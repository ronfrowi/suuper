import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { normalizeMany } from './pipeline/normalize'
import { upsertMany } from './pipeline/upsert'
import { matchMany } from './pipeline/match'
import type { TriggerSource } from './types'

// Dynamic import map for scraper modules
const SCRAPERS: Record<string, () => Promise<typeof import('./scrapers/pali')>> = {
  'pali':         () => import('./scrapers/pali'),
  'walmart-cr':   () => import('./scrapers/walmart-cr'),
  'mas-x-menos':  () => import('./scrapers/mas-x-menos'),
  'pricesmart':   () => import('./scrapers/pricesmart'),
  'automercado':  () => import('./scrapers/automercado'),
  'fresh-market': () => import('./scrapers/fresh-market'),
  'mega-super':   () => import('./scrapers/mega-super'),
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
)

/** Run the full scrape → normalize → upsert → match pipeline for one supermarket. */
export async function runScrapeJob(
  supermarketId: string,
  slug: string,
  triggeredBy: TriggerSource
): Promise<string> {
  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('scrape_jobs')
    .insert({
      supermarket_id: supermarketId,
      status: 'running',
      started_at: new Date().toISOString(),
      triggered_by: triggeredBy,
    })
    .select('id')
    .single()

  if (jobError || !job) throw new Error(`Failed to create scrape job: ${jobError?.message}`)

  const jobId = job.id
  const errors: string[] = []

  try {
    const scraperLoader = SCRAPERS[slug]
    if (!scraperLoader) throw new Error(`No scraper registered for: ${slug}`)

    const scraper = await scraperLoader()

    console.log(`[${slug}] Starting scrape...`)
    const rawProducts = await scraper.scrapeAll()
    console.log(`[${slug}] Scraped ${rawProducts.length} raw products`)

    const normalized = normalizeMany(rawProducts)
    const upsertResults = await upsertMany(supermarketId, normalized)

    const newProductIds = upsertResults
      .filter(r => r.isNew)
      .map(r => r.productId)

    console.log(`[${slug}] Upserted ${upsertResults.length} products; ${newProductIds.length} new`)

    // Generate embeddings + match only for new/updated products (batch)
    if (newProductIds.length > 0) {
      const matchStats = await matchMany(newProductIds)
      console.log(`[${slug}] Matching: ${matchStats.succeeded} ok, ${matchStats.failed} failed`)
      if (matchStats.failed > 0) {
        errors.push(`${matchStats.failed} embedding/match failures`)
      }
    }

    // Mark job completed
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        products_scraped: upsertResults.length,
        errors,
      })
      .eq('id', jobId)

    console.log(`[${slug}] Job ${jobId} completed`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[${slug}] Job ${jobId} failed:`, message)

    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        errors: [message],
      })
      .eq('id', jobId)
  }

  return jobId
}

async function runAll(triggeredBy: TriggerSource): Promise<void> {
  const { data: supermarkets } = await supabase
    .from('supermarkets')
    .select('id, slug')
    .eq('active', true)

  if (!supermarkets) return

  for (const sm of supermarkets) {
    await runScrapeJob(sm.id, sm.slug, triggeredBy)
  }
}

/** Start the daily cron scheduler — 02:00 AM Costa Rica time (UTC-6 = 08:00 UTC). */
export function startScheduler(): void {
  // '0 8 * * *' = 08:00 UTC = 02:00 America/Costa_Rica
  cron.schedule('0 8 * * *', () => {
    console.log('[scheduler] Starting daily run-all job')
    runAll('cron').catch(err => console.error('[scheduler] run-all failed:', err))
  }, { timezone: 'UTC' })

  console.log('[scheduler] Daily scrape scheduled for 02:00 America/Costa_Rica')
}
