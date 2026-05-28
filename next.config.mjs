/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: '/api/payments/webhook',
        headers: [{ key: 'Access-Control-Allow-Origin', value: 'https://api.midtrans.com' }],
      },
    ]
  },
}

export default nextConfig
