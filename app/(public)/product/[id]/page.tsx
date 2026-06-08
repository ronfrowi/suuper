import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCRC } from '@/lib/utils'
import PriceHistoryChart, { type PriceSeries } from '@/components/PriceHistoryChart'
import SupermarketBadge from '@/components/SupermarketBadge'
import Link from 'next/link'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: product }, { data: history }, { data: matches }] = await Promise.all([
    supabase
      .from('products')
      .select('*, supermarkets (id, slug, name)')
      .eq('id', params.id)
      .single(),

    supabase
      .from('price_history')
      .select('price, original_price, available, scraped_at')
      .eq('product_id', params.id)
      .order('scraped_at', { ascending: true })
      .limit(90),

    // Confirmed matches + their price history for the chart
    supabase
      .from('product_matches')
      .select(`
        similarity_score,
        match_method,
        confirmed,
        matched_product:products!matched_product_id (
          id, name, brand, unit,
          supermarkets (id, slug, name),
          price_history (price, original_price, available, scraped_at)
        )
      `)
      .eq('canonical_product_id', params.id)
      .order('similarity_score', { ascending: false })
      .limit(10),
  ])

  if (!product) notFound()

  const sm = product.supermarkets as { id: string; slug: string; name: string }

  // Build multi-series chart data: this product + all confirmed matches
  const chartSeries: PriceSeries[] = []

  if (history && history.length > 0) {
    chartSeries.push({
      supermarketSlug: sm.slug,
      supermarketName: sm.name,
      data: history,
    })
  }

  for (const m of matches ?? []) {
    const mp = m.matched_product as unknown as {
      id: string
      name: string
      supermarkets: { id: string; slug: string; name: string }
      price_history: Array<{ price: number; original_price: number | null; available: boolean; scraped_at: string }>
    } | null
    if (!mp?.price_history?.length) continue
    // Sort ascending so chart timeline is correct
    const sorted = [...mp.price_history].sort(
      (a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime()
    )
    chartSeries.push({
      supermarketSlug: mp.supermarkets.slug,
      supermarketName: mp.supermarkets.name,
      data: sorted,
    })
  }

  // Latest price per matched store for the comparison bar
  const latestPrices: Array<{
    id: string
    name: string
    sm: { slug: string; name: string }
    price: number
    available: boolean
  }> = []

  for (const m of matches ?? []) {
    const mp = m.matched_product as unknown as {
      id: string
      name: string
      supermarkets: { id: string; slug: string; name: string }
      price_history: Array<{ price: number; available: boolean; scraped_at: string }>
    } | null
    if (!mp) continue
    const ph = mp.price_history[0]
    if (!ph) continue
    latestPrices.push({
      id: mp.id,
      name: mp.name,
      sm: mp.supermarkets,
      price: ph.price,
      available: ph.available,
    })
  }

  const thisLatestPrice = history?.[history.length - 1]?.price
  const allPrices = [
    ...(thisLatestPrice != null ? [thisLatestPrice] : []),
    ...latestPrices.map(p => p.price),
  ]
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link href="/compare" className="text-sm text-green-600 hover:underline">
        ← Volver a comparación
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex gap-4 items-start">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-24 h-24 object-contain rounded-lg border flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <SupermarketBadge slug={sm.slug} name={sm.name} />
            <h1 className="text-2xl font-bold mt-1 leading-snug">{product.name}</h1>
            {product.brand && <p className="text-gray-500 mt-0.5">{product.brand}</p>}
            {product.unit  && <p className="text-sm text-gray-400">{product.unit}</p>}
            <p className="text-sm text-gray-400 mt-1">Categoría: {product.category}</p>
            {thisLatestPrice != null && (
              <p className="text-2xl font-bold text-green-700 mt-3">
                {formatCRC(thisLatestPrice)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cross-store current price comparison bar */}
      {latestPrices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Precio actual por supermercado</h2>
          <div className="space-y-2">
            {/* This store */}
            {thisLatestPrice != null && (
              <div className="flex items-center gap-3">
                <span className="w-32 text-sm font-medium text-gray-700 truncate">{sm.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-5 rounded-full bg-green-500"
                    style={{ width: `${(thisLatestPrice / Math.max(...allPrices)) * 100}%` }}
                  />
                </div>
                <span className={`text-sm font-semibold w-24 text-right ${thisLatestPrice === minPrice ? 'text-green-600' : 'text-gray-800'}`}>
                  {formatCRC(thisLatestPrice)}
                  {thisLatestPrice === minPrice && ' ✓'}
                </span>
              </div>
            )}
            {/* Matched stores */}
            {[...latestPrices]
              .sort((a, b) => a.price - b.price)
              .map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <Link href={`/product/${p.id}`} className="w-32 text-sm text-gray-700 truncate hover:text-green-600">
                    {p.sm.name}
                  </Link>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 rounded-full bg-blue-400"
                      style={{ width: `${(p.price / Math.max(...allPrices)) * 100}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-24 text-right ${p.price === minPrice ? 'text-green-600' : 'text-gray-800'}`}>
                    {p.available ? formatCRC(p.price) : 'Agotado'}
                    {p.price === minPrice && p.available && ' ✓'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Price history chart — multi-line, one per supermarket */}
      {chartSeries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Historial de Precios</h2>
          <PriceHistoryChart series={chartSeries} />
          <p className="text-xs text-gray-400 mt-2">
            Última actualización: {new Date(history?.[history.length - 1]?.scraped_at ?? '').toLocaleDateString('es-CR')}
          </p>
        </div>
      )}
    </div>
  )
}
