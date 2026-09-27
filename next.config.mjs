/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
