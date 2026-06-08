'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface Supermarket {
  id: string
  slug: string
  name: string
}

export default function CompareSearchBar({ supermarkets }: { supermarkets: Supermarket[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [supermarket, setSupermarket] = useState(searchParams.get('supermarket') ?? '')
  const [available, setAvailable] = useState(searchParams.get('available') ?? '')

  const push = useCallback(
    (q: string, sm: string, av: string) => {
      const params = new URLSearchParams()
      if (q)  params.set('q', q)
      if (sm) params.set('supermarket', sm)
      if (av) params.set('available', av)
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [router, pathname]
  )

  // Debounce the text query only; dropdowns fire immediately
  useEffect(() => {
    const timer = setTimeout(() => push(query, supermarket, available), 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function handleSmChange(val: string) {
    setSupermarket(val)
    push(query, val, available)
  }

  function handleAvailableChange(val: string) {
    setAvailable(val)
    push(query, supermarket, val)
  }

  function handleClear() {
    setQuery('')
    setSupermarket('')
    setAvailable('')
    router.push(pathname, { scroll: false })
  }

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <div className="relative flex-1 min-w-[200px]">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); push('', supermarket, available) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      <select
        value={supermarket}
        onChange={e => handleSmChange(e.target.value)}
        className="border rounded-lg px-3 py-2 bg-white"
      >
        <option value="">Todos los supermercados</option>
        {supermarkets.map(sm => (
          <option key={sm.id} value={sm.slug}>{sm.name}</option>
        ))}
      </select>

      <select
        value={available}
        onChange={e => handleAvailableChange(e.target.value)}
        className="border rounded-lg px-3 py-2 bg-white"
      >
        <option value="">Disponibilidad</option>
        <option value="true">Disponible</option>
      </select>

      {(query || supermarket || available) && (
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
