import { createClient } from '@/lib/supabase/server'
import ProductMatchCard from '@/components/ProductMatchCard'

export default async function AdminMatchesPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('product_matches')
    .select(`
      id,
      similarity_score,
      match_method,
      confirmed,
      canonical:products!canonical_product_id (
        id, name, brand, unit, image_url,
        supermarkets (name, slug),
        price_history (price, available, scraped_at)
      ),
      matched:products!matched_product_id (
        id, name, brand, unit, image_url,
        supermarkets (name, slug),
        price_history (price, available, scraped_at)
      )
    `)
    .eq('confirmed', false)
    .order('similarity_score', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Matches</h1>
        <p className="text-sm text-gray-500">{matches?.length ?? 0} pendientes</p>
      </div>

      <div className="space-y-4">
        {matches?.map(match => (
          <ProductMatchCard key={match.id} match={match as unknown as Parameters<typeof ProductMatchCard>[0]['match']} />
        ))}
        {(!matches || matches.length === 0) && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
            No hay matches pendientes de revisión.
          </div>
        )}
      </div>
    </div>
  )
}
