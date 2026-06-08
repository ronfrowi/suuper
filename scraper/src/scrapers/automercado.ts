/**
 * AutoMercado (automercado.cr) scraper.
 *
 * Angular Universal SSR app backed by Firebase Firestore.
 * Initial page load: 30 products (SSR'd into HTML).
 * Each click of the "Ver más" button loads 30 more from Firestore client-side.
 * Playwright is required to click through all pages.
 *
 * Confirmed selectors (June 2026):
 *   Product links:  a[href*="/id/"]       → /p/<slug>/id/<uuid>
 *   Name:           .title-product        (text)
 *   Price:          .price                (text, format ₡1,400)
 *   Image:          a.img-product img     (src)
 *   Load more:      a.text-success        matching /ver.?más/i
 *
 * Top-level categories from nav (June 2026):
 *   abarrotes, bebes-y-ninos, bebidas-alcoholicas, bebidas-no-alcoholicas,
 *   carnes-y-pescado, comidas-preparadas, congelados-y-refrigerados,
 *   cuidado-personal-y-belleza, frutas-y-verduras, lacteos-y-embutidos,
 *   limpieza-y-articulos-desechables, mascotas
 */

import { chromium, type Page } from 'playwright'
import * as cheerio from 'cheerio'
import type { RawProduct } from '../types'

const BASE_URL = 'https://automercado.cr'

const CATEGORIES = [
  'abarrotes',
  'bebes-y-ninos',
  'bebidas-alcoholicas',
  'bebidas-no-alcoholicas',
  'carnes-y-pescado',
  'comidas-preparadas',
  'congelados-y-refrigerados',
  'cuidado-personal-y-belleza',
  'frutas-y-verduras',
  'lacteos-y-embutidos',
  'limpieza-y-articulos-desechables',
  'mascotas',
]

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const randomDelay = () => delay(1500 + Math.random() * 2000)

function parseCRC(text: string): number {
  return parseFloat(text.replace(/₡/g, '').replace(/\./g, '').replace(',', '.').trim()) || 0
}

function extractProducts(html: string, categorySlug: string): RawProduct[] {
  const $ = cheerio.load(html)
  const products: RawProduct[] = []
  const seen = new Set<string>()

  $('a[href*="/id/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const uuidMatch = href.match(/\/id\/([a-f0-9-]{36})/)
    if (!uuidMatch) return

    const uuid = uuidMatch[1]
    if (seen.has(uuid)) return
    seen.add(uuid)

    const productUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    // Walk up from the link to find a container that holds exactly this product
    const card = $(el).closest('[class]').parent()

    const name = card.find('.title-product').first().text().trim()
    if (!name) return

    const priceText = card.find('.price').first().text().trim()
    const price = parseCRC(priceText)
    if (price === 0) return

    // Check for a second price element (original before discount)
    const allPrices = card.find('.price').map((_, p) => parseCRC($(p).text())).get().filter(p => p > 0)
    const original_price = allPrices.length > 1 ? Math.max(...allPrices) : null

    const imageUrl = card.find('a.img-product img, img[class*="img-fluid"]').first().attr('src') ?? null
    const unitText = card.find('[class*="presentation"], [class*="unidad"]').first().text().trim() || null
    const available = !card.text().toLowerCase().includes('agotado')

    const category = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    products.push({
      external_id: uuid,
      name,
      brand: null, // embedded in name; normalize.ts handles extraction
      price,
      original_price,
      currency: 'CRC',
      unit: unitText,
      category,
      image_url: imageUrl,
      product_url: productUrl,
      available,
      scraped_at: new Date().toISOString(),
    })
  })

  return products
}

async function scrapePageWithLoadMore(page: Page, url: string, categorySlug: string): Promise<RawProduct[]> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

  // Wait for at least one product card to appear
  await page.waitForSelector('a[href*="/id/"]', { timeout: 15000 })

  let previousCount = 0

  // Keep clicking "Ver más" until it disappears or count stops growing
  while (true) {
    await randomDelay()

    const verMasBtn = await page.$('a.text-success')
    const btnText = verMasBtn ? await verMasBtn.innerText() : ''
    if (!verMasBtn || !/ver.?m[aá]s/i.test(btnText)) break

    await verMasBtn.click()

    // Wait for new products to appear (count increases)
    try {
      await page.waitForFunction(
        (prev: number) => document.querySelectorAll('a[href*="/id/"]').length > prev,
        previousCount,
        { timeout: 10000 }
      )
    } catch {
      // Timeout — no new products loaded, we're done
      break
    }

    const currentCount = await page.evaluate(
      () => new Set(Array.from(document.querySelectorAll('a[href*="/id/"]')).map(a => (a as HTMLAnchorElement).href.match(/\/id\/([a-f0-9-]{36})/)?.[1]).filter(Boolean)).size
    )

    if (currentCount === previousCount) break
    previousCount = currentCount
  }

  const html = await page.content()
  return extractProducts(html, categorySlug)
}

async function withBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-CR',
  })
  const page = await context.newPage()
  try {
    return await fn(page)
  } finally {
    await browser.close()
  }
}

export async function scrapeAll(): Promise<RawProduct[]> {
  return withBrowser(async (page) => {
    const all: RawProduct[] = []

    for (const slug of CATEGORIES) {
      try {
        const products = await scrapePageWithLoadMore(page, `${BASE_URL}/categorias/${slug}`, slug)
        console.log(`[automercado] ${slug}: ${products.length} products`)
        all.push(...products)
      } catch (err) {
        console.error(`[automercado] failed category "${slug}":`, err)
      }
    }

    // Deduplicate by UUID (same product may appear in multiple categories)
    const seen = new Set<string>()
    return all.filter(p => {
      if (seen.has(p.external_id)) return false
      seen.add(p.external_id)
      return true
    })
  })
}

export async function scrapeCategory(categoryUrl: string): Promise<RawProduct[]> {
  const slug = categoryUrl.startsWith('http')
    ? new URL(categoryUrl).pathname.split('/').filter(Boolean).pop()!
    : categoryUrl.replace(/^\/categorias\//, '')

  return withBrowser((page) =>
    scrapePageWithLoadMore(page, `${BASE_URL}/categorias/${slug}`, slug)
  )
}

export async function scrapeProduct(productUrl: string): Promise<RawProduct> {
  const uuidMatch = productUrl.match(/\/id\/([a-f0-9-]{36})/)
  if (!uuidMatch) throw new Error(`Cannot extract UUID from: ${productUrl}`)
  const uuid = uuidMatch[1]

  const slugMatch = productUrl.match(/\/p\/([^/]+)\/id\//)
  const slug = slugMatch?.[1] ?? uuid
  const fullUrl = productUrl.startsWith('http') ? productUrl : `${BASE_URL}/p/${slug}/id/${uuid}`

  return withBrowser(async (page) => {
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForSelector('.title-product', { timeout: 10000 })
    const html = await page.content()
    const $ = cheerio.load(html)

    const name = $('.title-product').first().text().trim()
    if (!name) throw new Error(`Product name not found: ${fullUrl}`)

    const price = parseCRC($('.price').first().text())
    if (price === 0) throw new Error(`Price not found: ${fullUrl}`)

    const imageUrl = $('a.img-product img').first().attr('src') ?? null
    const category = $('a[href*="/categorias/"]').last().text().trim() || 'General'
    const unitText = $('[class*="presentation"]').first().text().trim() || null

    return {
      external_id: uuid,
      name,
      brand: null,
      price,
      original_price: null,
      currency: 'CRC',
      unit: unitText,
      category,
      image_url: imageUrl,
      product_url: fullUrl,
      available: !$('body').text().toLowerCase().includes('agotado'),
      scraped_at: new Date().toISOString(),
    }
  })
}
