'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCRC } from '@/lib/utils'
import type { ProductGroup } from '@/lib/compare/grouping'

interface Supermarket {
  id: string
  slug: string
  name: string
}

type SortKey = 'name' | 'min' | 'max' | 'avg' | 'diff'
type SortDir = 'asc' | 'desc'

export default function ComparisonTable({
  groups,
  supermarkets,
}: {
  groups: ProductGroup[]
  supermarkets: Supermarket[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(() => {
    return groups.map(group => {
      const prices = supermarkets
        .map(sm => group.byStore.get(sm.slug)?.price_history[0]?.price)
        .filter((p): p is number => p != null)

      const min = prices.length > 0 ? Math.min(...prices) : null
      const max = prices.length > 0 ? Math.max(...prices) : null
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null

      return { group, min, max, avg }
    })
  }, [groups, supermarkets])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let va: number | string
      let vb: number | string
      if (sortKey === 'name') { va = a.group.name; vb = b.group.name }
      else if (sortKey === 'min')  { va = a.min ?? Infinity; vb = b.min ?? Infinity }
      else if (sortKey === 'max')  { va = a.max ?? 0; vb = b.max ?? 0 }
      else if (sortKey === 'avg')  { va = a.avg ?? 0; vb = b.avg ?? 0 }
      else { // diff
        va = a.min != null && a.max != null ? a.max - a.min : 0
        vb = b.min != null && b.max != null ? b.max - b.min : 0
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      {label}{sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No se encontraron productos. Intenta con otra búsqueda.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b sticky top-0 z-10">
          <tr>
            <Th col="name" label="Producto" />
            {supermarkets.map(sm => (
              <th
                key={sm.slug}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
              >
                {sm.name}
              </th>
            ))}
            <Th col="min" label="Mínimo" />
            <Th col="max" label="Máximo" />
            <Th col="avg" label="Promedio" />
            <Th col="diff" label="Diferencia" />
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map(({ group, min, max, avg }) => (
            <tr key={group.key} className="hover:bg-gray-50">
              {/* Product name + image */}
              <td className="px-3 py-3 max-w-[260px]">
                <div className="flex items-center gap-2">
                  {group.image_url && (
                    <img
                      src={group.image_url}
                      alt=""
                      className="w-8 h-8 object-contain rounded flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium leading-snug line-clamp-2">{group.name}</p>
                    {group.unit && <p className="text-xs text-gray-400">{group.unit}</p>}
                    {group.matchBased && (
                      <span className="text-xs text-blue-500">✓ match</span>
                    )}
                  </div>
                </div>
              </td>

              {/* Per-supermarket price */}
              {supermarkets.map(sm => {
                const product = group.byStore.get(sm.slug)
                const ph = product?.price_history[0]
                if (!ph) {
                  return (
                    <td key={sm.slug} className="px-3 py-3 text-gray-300 text-center">
                      —
                    </td>
                  )
                }
                const isMin = min != null && ph.price === min
                const isMax = max != null && ph.price === max
                return (
                  <td
                    key={sm.slug}
                    className={`px-3 py-3 font-medium ${
                      isMin ? 'text-green-600' : isMax ? 'text-red-500' : 'text-gray-800'
                    }`}
                  >
                    {formatCRC(ph.price)}
                    {ph.original_price != null && (
                      <span className="block text-xs text-gray-400 line-through">
                        {formatCRC(ph.original_price)}
                      </span>
                    )}
                    {!ph.available && (
                      <span className="block text-xs text-gray-400">Agotado</span>
                    )}
                  </td>
                )
              })}

              {/* Summary columns */}
              <td className="px-3 py-3 font-semibold text-green-700">
                {min != null ? formatCRC(min) : '—'}
              </td>
              <td className="px-3 py-3 font-semibold text-red-500">
                {max != null ? formatCRC(max) : '—'}
              </td>
              <td className="px-3 py-3 text-gray-600">
                {avg != null ? formatCRC(avg) : '—'}
              </td>
              <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                {min != null && max != null && avg != null
                  ? `${formatCRC(max - min)} (${(((max - min) / avg) * 100).toFixed(0)}%)`
                  : '—'}
              </td>
              <td className="px-3 py-3">
                <Link
                  href={`/product/${group.representativeId}`}
                  className="text-xs text-green-600 hover:underline whitespace-nowrap"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-gray-400 border-t">
        {sorted.length} grupos · {sorted.filter(r => r.group.matchBased).length} con match confirmado
      </p>
    </div>
  )
}
