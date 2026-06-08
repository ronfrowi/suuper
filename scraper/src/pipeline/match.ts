import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const productSearchText = (name: string, brand: string | null, unit: string | null) =>
  [brand, name, unit].filter(Boolean).join(' ')

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SIMILARITY_THRESHOLD = 0.85
const TOP_K = 5

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8192),
  })
  return response.data[0].embedding
}

interface ProductRow {
  id: string
  name: string
  brand: string | null
  unit: string | null
  supermarket_id: string
}

/** Generate embedding for a product and store it, then find cross-store matches. */
export async function matchProduct(productId: string): Promise<void> {
  // Fetch the product
  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, brand, unit, supermarket_id')
    .eq('id', productId)
    .single<ProductRow>()

  if (error || !product) throw new Error(`matchProduct: product not found: ${productId}`)

  const searchText = productSearchText(product.name, product.brand, product.unit)
  const embedding = await generateEmbedding(searchText)

  // Store embedding
  const { error: updateError } = await supabase
    .from('products')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', productId)

  if (updateError) throw new Error(`matchProduct: failed to store embedding: ${updateError.message}`)

  // Query pgvector for nearest neighbours from OTHER supermarkets
  const { data: matches, error: matchError } = await supabase.rpc('match_products', {
    query_embedding: JSON.stringify(embedding),
    source_supermarket_id: product.supermarket_id,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: TOP_K,
  }) as { data: Array<{ id: string; similarity: number }> | null; error: unknown }

  if (matchError) throw new Error(`matchProduct: pgvector rpc failed: ${JSON.stringify(matchError)}`)
  if (!matches || matches.length === 0) return

  // Insert product_matches (ignore conflicts — match may already exist)
  const rows = matches.map(m => ({
    canonical_product_id: productId,
    matched_product_id: m.id,
    similarity_score: m.similarity,
    match_method: 'embedding',
    confirmed: false,
  }))

  const { error: insertError } = await supabase
    .from('product_matches')
    .upsert(rows, { onConflict: 'canonical_product_id,matched_product_id', ignoreDuplicates: true })

  if (insertError) throw new Error(`matchProduct: failed to insert matches: ${insertError.message}`)
}

/** Run matching for a batch of product IDs with a small delay between calls. */
export async function matchMany(productIds: string[]): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0
  let failed = 0

  for (const id of productIds) {
    try {
      await matchProduct(id)
      succeeded++
      // Rate-limit OpenAI calls
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`matchMany: failed for ${id}:`, err)
      failed++
    }
  }

  return { succeeded, failed }
}
