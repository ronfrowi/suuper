const SLUG_COLORS: Record<string, string> = {
  'walmart-cr':   'bg-blue-100 text-blue-700',
  'mas-x-menos':  'bg-orange-100 text-orange-700',
  'pricesmart':   'bg-red-100 text-red-700',
  'automercado':  'bg-purple-100 text-purple-700',
  'fresh-market': 'bg-green-100 text-green-700',
  'mega-super':   'bg-yellow-100 text-yellow-700',
  'pali':         'bg-cyan-100 text-cyan-700',
}

export default function SupermarketBadge({ slug, name }: { slug: string; name: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SLUG_COLORS[slug] ?? 'bg-gray-100 text-gray-600'}`}>
      {name}
    </span>
  )
}
