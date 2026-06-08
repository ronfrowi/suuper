/**
 * Shared VTEX IO scraper helper.
 * Used by: pali, walmart-cr, mas-x-menos, mega-super.
 */

import axios from 'axios'
import type { RawProduct } from '../types'

const PAGE_SIZE = 50

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
export const randomDelay = () => delay(1500 + Math.random() * 2000)

interface VtexProduct {
  productId: string
  productName: string
  brand: string
  categories: string[]
  items: VtexItem[]
  link: string
  images?: Array<{ imageUrl: string }>
}

interface VtexItem {
  unitMultiplier: number
  measurementUnit: string
  sellers: VtexSeller[]
}

interface VtexSeller {
  commertialOffer: {
    Price: number
    ListPrice: number
    IsAvailable: boolean
  }
}

function parseVtexProduct(raw: VtexProduct): RawProduct | null {
  const item = raw.items?.[0]
  if (!item) return null
  const seller = item.sellers?.[0]?.commertialOffer
  if (!seller) return null

  const price = seller.Price
  const listPrice = seller.ListPrice
  const category =
    raw.categories?.[raw.categories.length - 1]?.replace(/\//g, '').trim() ?? 'General'
  const unit =
    item.measurementUnit && item.unitMultiplier
      ? `${item.unitMultiplier}${item.measurementUnit}`
      : null

  return {
    external_id: raw.productId,
    name: raw.productName,
    brand: raw.brand || null,
    price,
    original_price: listPrice > price ? listPrice : null,
    currency: 'CRC',
    unit,
    category,
    image_url: raw.images?.[0]?.imageUrl ?? null,
    product_url: raw.link,
    available: seller.IsAvailable,
    scraped_at: new Date().toISOString(),
  }
}

async function fetchPage(
  searchApi: string,
  from: number,
  to: number,
  params: Record<string, string> = {}
): Promise<VtexProduct[]> {
  const { data } = await axios.get<VtexProduct[]>(searchApi, {
    params: { _from: from, _to: to, ...params },
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SuuperBot/1.0)', Accept: 'application/json' },
    timeout: 15000,
  })
  return Array.isArray(data) ? data : []
}

export async function vtexFetchAll(
  searchApi: string,
  params: Record<string, string> = {}
): Promise<RawProduct[]> {
  const products: RawProduct[] = []
  let from = 0

  while (true) {
    await randomDelay()
    const page = await fetchPage(searchApi, from, from + PAGE_SIZE - 1, params)
    if (page.length === 0) break
    for (const raw of page) {
      const p = parseVtexProduct(raw)
      if (p) products.push(p)
    }
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return products
}

export async function vtexFetchOne(searchApi: string, productUrl: string): Promise<RawProduct> {
  const slug = new URL(productUrl).pathname.replace(/\/$/, '').split('/').pop()!
  const { data } = await axios.get<VtexProduct[]>(searchApi, {
    params: { fq: `linkText:${slug}`, _from: 0, _to: 0 },
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SuuperBot/1.0)', Accept: 'application/json' },
    timeout: 15000,
  })
  if (!data?.[0]) throw new Error(`Product not found: ${productUrl}`)
  const parsed = parseVtexProduct(data[0])
  if (!parsed) throw new Error(`Failed to parse product: ${productUrl}`)
  return parsed
}

export function categoryParam(categoryUrl: string): Record<string, string> {
  const path = categoryUrl.startsWith('http')
    ? new URL(categoryUrl).pathname
    : categoryUrl
  return { fq: `C:${path}` }
}
