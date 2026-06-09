import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import type { NormalizedProduct } from './normalize'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as any } }
)

export interface UpsertResult {
  productId: string
  isNew: boolean
}

/** Upsert one product and append a price_history row. Returns the product id. */
export async function upsertProduct(
  supermarketId: string,
  product: NormalizedProduct
): Promise<UpsertResult> {
  // Upsert the product record (conflict on supermarket_id + external_id)
  const { data, error } = await supabase
    .from('products')
    .upsert(
      {
        supermarket_id: supermarketId,
        external_id: product.external_id,
        name: product.name,
        brand: product.brand,
        unit: product.unit,
        category: product.category,
        image_url: product.image_url,
        product_url: product.product_url,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'supermarket_id,external_id', ignoreDuplicates: false }
    )
    .select('id, created_at, updated_at')
    .single()

  if (error) throw new Error(`upsert product failed: ${error.message}`)

  const isNew = data.created_at === data.updated_at

  // Always insert a new price_history row
  const { error: phError } = await supabase.from('price_history').insert({
    product_id: data.id,
    price: product.price,
    original_price: product.original_price,
    available: product.available,
    scraped_at: product.scraped_at,
  })

  if (phError) throw new Error(`insert price_history failed: ${phError.message}`)

  return { productId: data.id, isNew }
}

/** Batch upsert with chunking to avoid Supabase payload limits. */
export async function upsertMany(
  supermarketId: string,
  products: NormalizedProduct[]
): Promise<UpsertResult[]> {
  const CHUNK = 100
  const results: UpsertResult[] = []

  for (let i = 0; i < products.length; i += CHUNK) {
    const chunk = products.slice(i, i + CHUNK)
    const chunkResults = await Promise.all(
      chunk.map(p => upsertProduct(supermarketId, p))
    )
    results.push(...chunkResults)
  }

  return results
}
