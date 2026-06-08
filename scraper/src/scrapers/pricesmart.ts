/**
 * PriceSmart Costa Rica scraper.
 *
 * Uses the Bloomreach Discovery API that powers the Nuxt frontend.
 * Confirmed via XHR intercept (June 2026).
 *
 * API: POST https://www.pricesmart.com/api/br_discovery/getProductsByKeyword
 * Body: array wrapping one params object:
 *   [{
 *     url, ref_url,           // current/previous page URL (for analytics only)
 *     q: "<categoryKey>",     // e.g. "G10D03"
 *     search_type: "category",
 *     start: 0,               // offset (increments by rows)
 *     rows: 100,              // page size
 *     fq: [],
 *     account_id: "7024",
 *     auth_key: "ev7libhybjg5h1d1",
 *     domain_key: "pricesmart_bloomreach_io_es",
 *     view_id: "CR",
 *     fl: "<fieldList>",
 *   }]
 *
 * Response: { response: { numFound, start, docs: Doc[] } }
 *
 * Doc fields (confirmed):
 *   pid, title, brand, thumb_image, slug, currency,
 *   price_CR      — price in CRC cents (divide by 100)
 *   availability_CR — "true" / "false"
 *   inventory_CR  — "in stock" / "out of stock"
 *   original_price_without_saving_CR — pre-discount price cents (or absent)
 *   saving_amount_CR                 — discount amount cents (or absent)
 *
 * Product URL: https://www.pricesmart.com/es-cr/producto/<slug>/<pid>
 *
 * Categories hardcoded from /es-cr/categorias (June 2026):
 *   Only food/grocery-relevant ones included; full list available if needed.
 */

import axios from 'axios'
import type { RawProduct } from '../types'

const BASE_URL = 'https://www.pricesmart.com'
const API_URL = `${BASE_URL}/api/br_discovery/getProductsByKeyword`

// Bloomreach credentials — embedded in the Nuxt app bundle (public, read-only)
const ACCOUNT_ID = '7024'
const AUTH_KEY = 'ev7libhybjg5h1d1'
const DOMAIN_KEY = 'pricesmart_bloomreach_io_es'
const VIEW_ID = 'CR'
const ROWS = 100

const FL = [
  'pid', 'title', 'brand', 'thumb_image', 'slug', 'currency', 'fractionDigits',
  'price_CR', 'availability_CR', 'inventory_CR',
  'original_price_without_saving_CR', 'saving_amount_CR',
].join(',')

// Top-level categories from /es-cr/categorias (key → display name)
const CATEGORIES: Array<{ key: string; name: string }> = [
  { key: 'G10D03',     name: 'Alimentos' },
  { key: 'G10D08014',  name: 'Licor, cerveza y vino' },
  { key: 'H20D09',     name: 'Salud y belleza' },
  { key: 'P10D51',     name: 'Mascotas' },
  { key: 'B10D27',     name: 'Bebé' },
  { key: 'H30D22',     name: 'Hogar' },
  { key: 'H10D21',     name: 'Ferretería y mejoras al hogar' },
  { key: 'S30D26',     name: 'Deportes y fitness' },
  { key: 'O20D30',     name: 'Exteriores' },
  { key: 'E10D24',     name: 'Electrónicos' },
  { key: 'S20D23',     name: 'Electrodomésticos' },
  { key: 'C10D29',     name: 'Computadoras, tablets y accesorios' },
  { key: 'M10D43',     name: 'Línea blanca' },
  { key: 'F10D40',     name: 'Moda y accesorios' },
  { key: 'F20D27',     name: 'Muebles' },
  { key: 'O10D25',     name: 'Oficina' },
  { key: 'T10D46',     name: 'Juguetes y juegos' },
  { key: 'S10D45',     name: 'Productos de temporada' },
]

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const randomDelay = () => delay(800 + Math.random() * 1200)

interface BrDoc {
  pid: string
  title: string
  brand?: string
  thumb_image?: string
  slug?: string
  currency?: string
  fractionDigits?: number
  price_CR?: number
  availability_CR?: string
  inventory_CR?: string
  original_price_without_saving_CR?: number
  saving_amount_CR?: number
}

interface BrResponse {
  response: {
    numFound: number
    start: number
    docs: BrDoc[]
  }
}

function buildParams(categoryKey: string, start: number, pageUrl: string, refUrl: string) {
  return [{
    url: pageUrl,
    ref_url: refUrl,
    q: categoryKey,
    fq: [],
    search_type: 'category',
    rows: ROWS,
    start,
    account_id: ACCOUNT_ID,
    auth_key: AUTH_KEY,
    domain_key: DOMAIN_KEY,
    view_id: VIEW_ID,
    fl: FL,
    request_id: Date.now(),
  }]
}

function mapDoc(doc: BrDoc, categoryName: string): RawProduct {
  const decimals = doc.fractionDigits ?? 2
  const divisor = Math.pow(10, decimals)
  const price = (doc.price_CR ?? 0) / divisor
  const originalRaw = doc.original_price_without_saving_CR
  const original_price = originalRaw && originalRaw > (doc.price_CR ?? 0)
    ? originalRaw / divisor
    : null

  const productUrl = doc.slug
    ? `${BASE_URL}/es-cr/producto/${doc.slug}/${doc.pid}`
    : `${BASE_URL}/es-cr/producto/${doc.pid}`

  return {
    external_id: doc.pid,
    name: doc.title,
    brand: doc.brand || null,
    price,
    original_price,
    currency: 'CRC',
    unit: null,
    category: categoryName,
    image_url: doc.thumb_image || null,
    product_url: productUrl,
    available: doc.availability_CR === 'true' || doc.inventory_CR === 'in stock',
    scraped_at: new Date().toISOString(),
  }
}

async function fetchCategoryAll(categoryKey: string, categoryName: string): Promise<RawProduct[]> {
  const products: RawProduct[] = []
  let start = 0
  let total = Infinity
  const baseUrl = `${BASE_URL}/es-cr/categoria/${categoryName.replace(/ /g, '-')}-${categoryKey}/${categoryKey}`

  while (start < total) {
    if (start > 0) await randomDelay()

    const pageUrl = `${baseUrl}?page=${Math.floor(start / ROWS) + 1}`
    const body = buildParams(categoryKey, start, pageUrl, start === 0 ? `${BASE_URL}/es-cr/categorias` : `${baseUrl}?page=${Math.floor(start / ROWS)}`)

    const { data } = await axios.post<BrResponse>(API_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': pageUrl,
        'Origin': BASE_URL,
      },
      timeout: 15000,
    })

    const { numFound, docs } = data.response
    total = numFound

    for (const doc of docs) {
      if (doc.pid) products.push(mapDoc(doc, categoryName))
    }

    console.log(`[pricesmart] ${categoryName} (${categoryKey}): ${start + docs.length}/${total}`)
    start += ROWS
  }

  return products
}

export async function scrapeAll(): Promise<RawProduct[]> {
  const all: RawProduct[] = []

  for (const cat of CATEGORIES) {
    try {
      const products = await fetchCategoryAll(cat.key, cat.name)
      console.log(`[pricesmart] ${cat.name}: ${products.length} products`)
      all.push(...products)
    } catch (err) {
      console.error(`[pricesmart] category "${cat.name}" failed:`, err)
    }
  }

  // Deduplicate — same product may appear in multiple categories
  const seen = new Set<string>()
  return all.filter(p => {
    if (seen.has(p.external_id)) return false
    seen.add(p.external_id)
    return true
  })
}

export async function scrapeCategory(categoryUrl: string): Promise<RawProduct[]> {
  // Accept category key directly or extract from URL path
  const keyMatch = categoryUrl.match(/\/([A-Z][0-9]+D[0-9]+(?:[0-9]+)?)(?:\/|$)/)
  const key = keyMatch?.[1] ?? categoryUrl
  const cat = CATEGORIES.find(c => c.key === key)
  return fetchCategoryAll(key, cat?.name ?? 'General')
}

export async function scrapeProduct(productUrl: string): Promise<RawProduct> {
  // Extract pid from URL: /es-cr/producto/<slug>/<pid>
  const pidMatch = productUrl.match(/\/producto\/[^/]+\/(\d+)/) ?? productUrl.match(/\/(\d+)$/)
  if (!pidMatch) throw new Error(`Cannot extract product ID from: ${productUrl}`)
  const pid = pidMatch[1]

  // Use the search API with the pid as a direct query
  const { data } = await axios.post<BrResponse>(API_URL, [{
    url: productUrl,
    ref_url: `${BASE_URL}/es-cr`,
    q: pid,
    fq: [],
    search_type: 'keyword',
    rows: 1,
    start: 0,
    account_id: ACCOUNT_ID,
    auth_key: AUTH_KEY,
    domain_key: DOMAIN_KEY,
    view_id: VIEW_ID,
    fl: FL,
    request_id: Date.now(),
  }], {
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  })

  const doc = data.response?.docs?.[0]
  if (!doc) throw new Error(`Product not found: ${productUrl}`)
  return mapDoc(doc, 'General')
}
