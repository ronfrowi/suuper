import type { RawProduct } from '../types'

// Common unit patterns to extract from product names
const UNIT_PATTERNS: [RegExp, string][] = [
  [/(\d+(?:\.\d+)?)\s*(kg|kilo(?:gram)?s?)\b/i, '$1kg'],
  [/(\d+(?:\.\d+)?)\s*(g|gr|grs|gram(?:o)?s?)\b/i, '$1g'],
  [/(\d+(?:\.\d+)?)\s*(l|lt|lit(?:ro)?s?|litre?s?)\b/i, '$1L'],
  [/(\d+(?:\.\d+)?)\s*(ml|millilitre?s?)\b/i, '$1ml'],
  [/(\d+(?:\.\d+)?)\s*(oz|onza?s?)\b/i, '$1oz'],
  [/(\d+(?:\.\d+)?)\s*(lb|libra?s?)\b/i, '$1lb'],
  [/(\d+(?:\.\d+)?)\s*(un(?:id(?:ad(?:es)?)?)?|pcs?|piece?s?)\b/i, '$1un'],
  [/(\d+)\s*(pack|paq(?:uete)?s?|caja|ct|count)\b/i, '$1pk'],
]

/** Normalize a raw product name: trim, collapse whitespace, title-case. */
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, '')
}

/** Normalize brand: trim, null if empty string. */
function normalizeBrand(brand: string | null): string | null {
  if (!brand) return null
  const trimmed = brand.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Extract unit from product name if not already provided. */
function extractUnit(name: string, existing: string | null): string | null {
  if (existing && existing.trim().length > 0) return existing.trim()

  for (const [pattern, template] of UNIT_PATTERNS) {
    const match = name.match(pattern)
    if (match) {
      return match[0].trim().replace(pattern, template)
    }
  }
  return null
}

/** Normalize category: strip leading slashes, title-case. */
function normalizeCategory(category: string): string {
  return category
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .pop()!
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()) || 'General'
}

export interface NormalizedProduct {
  external_id: string
  name: string
  brand: string | null
  price: number
  original_price: number | null
  currency: 'CRC'
  unit: string | null
  category: string
  image_url: string | null
  product_url: string
  available: boolean
  scraped_at: string
}

export function normalize(raw: RawProduct): NormalizedProduct {
  const name = normalizeName(raw.name)
  return {
    external_id: raw.external_id.trim(),
    name,
    brand: normalizeBrand(raw.brand),
    price: Math.round(raw.price * 100) / 100,
    original_price: raw.original_price != null
      ? Math.round(raw.original_price * 100) / 100
      : null,
    currency: 'CRC',
    unit: extractUnit(name, raw.unit),
    category: normalizeCategory(raw.category),
    image_url: raw.image_url?.trim() ?? null,
    product_url: raw.product_url.trim(),
    available: raw.available,
    scraped_at: raw.scraped_at,
  }
}

export function normalizeMany(raws: RawProduct[]): NormalizedProduct[] {
  return raws.map(normalize)
}
