import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import ComparisonTable from '@/components/ComparisonTable'
import CompareSearchBar from '@/components/CompareSearchBar'
import { buildProductGroups } from '@/lib/compare/grouping'

interface SearchParams {
  q?: string
  supermarket?: string
  category?: string
  available?: string
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()

  const [{ data: supermarkets }, productsResult, matchesResult] = await Promise.all([
    supabase.from('supermarkets').select('id, slug, name').eq('active', true).order('name'),

    (() => {
      let q = supabase
        .from('products')
        .select(`
          id,
          name,
          brand,
          unit,
          category,
          image_url,
          product_url,
          supermarket_id,
          supermarkets!inner (id, slug, name),
          price_history (
            price,
            original_price,
            available,
            scraped_at
          )
        `)
        .eq('active', true)
        .order('scraped_at', { referencedTable: 'price_history', ascending: false })
        .limit(1, { referencedTable: 'price_history' })

      if (searchParams.q)           q = q.ilike('name', `%${searchParams.q}%`)
      if (searchParams.supermarket) q = q.eq('supermarkets.slug', searchParams.supermarket)
      if (searchParams.category)    q = q.eq('category', searchParams.category)
      if (searchParams.available === 'true')
                                    q = q.eq('price_history.available', true)

      return q.limit(500)
    })(),

    supabase
      .from('product_matches')
      .select('canonical_product_id, matched_product_id')
      .eq('confirmed', true),
  ])

  const products = productsResult.data ?? []
  const matches  = matchesResult.data ?? []

  const groups = buildProductGroups(
    products as unknown as Parameters<typeof buildProductGroups>[0],
    matches as unknown as Parameters<typeof buildProductGroups>[1]
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Comparación de Precios</h1>

      {/* Suspense required because CompareSearchBar uses useSearchParams */}
      <Suspense fallback={<div className="h-12 bg-gray-100 rounded-lg animate-pulse mb-8" />}>
        <CompareSearchBar supermarkets={supermarkets ?? []} />
      </Suspense>

      {productsResult.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Error cargando productos: {productsResult.error.message}
        </div>
      )}

      <ComparisonTable groups={groups} supermarkets={supermarkets ?? []} />
    </div>
  )
}
