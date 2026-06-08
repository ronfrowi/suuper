/**
 * Mega Super (megasuper.co.cr) scraper — VTEX IO platform.
 * Uses shared vtex.ts helper.
 * Note: brand field sometimes arrives as empty string; normalize.ts converts to null.
 */

import { vtexFetchAll, vtexFetchOne, categoryParam } from './vtex'
import type { RawProduct } from '../types'

const SEARCH_API = 'https://www.megasuper.co.cr/api/catalog_system/pub/products/search'

export async function scrapeAll(): Promise<RawProduct[]> {
  return vtexFetchAll(SEARCH_API, { O: 'OrderByTopSaleDESC' })
}

export async function scrapeCategory(categoryUrl: string): Promise<RawProduct[]> {
  return vtexFetchAll(SEARCH_API, categoryParam(categoryUrl))
}

export async function scrapeProduct(productUrl: string): Promise<RawProduct> {
  return vtexFetchOne(SEARCH_API, productUrl)
}
