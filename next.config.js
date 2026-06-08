/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.vteximg.com.br' },
      { protocol: 'https', hostname: '*.vtexassets.com' },
      { protocol: 'https', hostname: '*.automercado.cr' },
      { protocol: 'https', hostname: 'ik.imagekit.io' },
      { protocol: 'https', hostname: '*.freshmarket.co.cr' },
      { protocol: 'https', hostname: 'd31f1ehqijlcua.cloudfront.net' },
      { protocol: 'https', hostname: 'pricesmart.bloomreach.io' },
    ],
  },
}

module.exports = nextConfig
