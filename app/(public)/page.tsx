import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-green-600">Suuper</h1>
        <p className="text-xl text-gray-600">
          Compara precios en los supermercados de Costa Rica
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/compare"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Ver comparación de precios
        </Link>
        <Link
          href="/admin"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
        >
          Admin
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mt-8">
        {['Walmart CR', 'Más x Menos', 'PriceSmart', 'AutoMercado', 'Fresh Market', 'Mega Super', 'Palí'].map(sm => (
          <span key={sm} className="px-3 py-1 bg-white border rounded-full text-center shadow-sm">
            {sm}
          </span>
        ))}
      </div>
    </main>
  )
}
