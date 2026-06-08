/**
 * Más x Menos (masxmenos.cr) scraper — VTEX IO platform.
 * Uses shared vtex.ts helper.
 */

import { vtexFetchAll, vtexFetchOne, categoryParam } from './vtex'
import type { RawProduct } from '../types'

const SEARCH_API = 'https://www.masxmenos.cr/api/catalog_system/pub/products/search'

export async function scrapeAll(): Promise<RawProduct[]> {
  return vtexFetchAll(SEARCH_API, { O: 'OrderByTopSaleDESC' })
}

export async function scrapeCategory(categoryUrl: string): Promise<RawProduct[]> {
  return vtexFetchAll(SEARCH_API, categoryParam(categoryUrl))
}

export async function scrapeProduct(productUrl: string): Promise<RawProduct> {
  return vtexFetchOne(SEARCH_API, productUrl)
}
