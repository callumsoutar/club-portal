/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  // The FR24 SDK bundles axios and Node APIs. Keep it out of the RSC bundler.
  serverExternalPackages: ["@flightradar24/fr24sdk"],
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
