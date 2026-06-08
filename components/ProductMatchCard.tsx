'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCRC } from '@/lib/utils'

interface MatchProduct {
  id: string
  name: string
  brand: string | null
  unit: string | null
  image_url: string | null
  supermarkets: { name: string; slug: string }
  price_history: Array<{ price: number; available: boolean; scraped_at: string }>
}

interface Match {
  id: string
  similarity_score: number
  match_method: string
  confirmed: boolean
  canonical: MatchProduct
  matched: MatchProduct
}

export default function ProductMatchCard({ match }: { match: Match }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'confirmed' | 'rejected'>('idle')
  const supabase = createClient()

  async function handleConfirm(confirmed: boolean) {
    setStatus('loading')
    if (confirmed) {
      await supabase.from('product_matches').update({ confirmed: true }).eq('id', match.id)
      setStatus('confirmed')
    } else {
      await supabase.from('product_matches').delete().eq('id', match.id)
      setStatus('rejected')
    }
  }

  if (status === 'confirmed') {
    return <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">Match confirmado.</div>
  }
  if (status === 'rejected') {
    return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">Match rechazado.</div>
  }

  const ProductSide = ({ product }: { product: MatchProduct }) => {
    const latestPrice = product.price_history?.[0]?.price
    return (
      <div className="flex-1 flex items-start gap-3">
        {product.image_url && (
          <img src={product.image_url} alt="" className="w-12 h-12 object-contain rounded border flex-shrink-0" />
        )}
        <div>
          <p className="text-xs text-gray-400">{product.supermarkets?.name}</p>
          <p className="font-medium text-sm leading-snug">{product.name}</p>
          {product.brand && <p className="text-xs text-gray-500">{product.brand}</p>}
          {product.unit && <p className="text-xs text-gray-400">{product.unit}</p>}
          <p className="font-semibold text-green-700 mt-1">
            {latestPrice != null ? formatCRC(latestPrice) : '—'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border">
      <div className="flex items-start gap-4">
        <ProductSide product={match.canonical} />
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="text-2xl text-gray-300">↔</div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {(match.similarity_score * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">{match.match_method}</span>
        </div>
        <ProductSide product={match.matched} />
      </div>
      <div className="flex gap-3 mt-4 justify-end">
        <button
          onClick={() => handleConfirm(false)}
          disabled={status === 'loading'}
          className="px-4 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          onClick={() => handleConfirm(true)}
          disabled={status === 'loading'}
          className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
