import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3100', 'localhost:3000'],
    },
  },
}

export default nextConfig
