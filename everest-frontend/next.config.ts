import type { NextConfig } from 'next'
// Next.js 15.3.3 — patched CVE-2025-66478
const nextConfig: NextConfig = {
  // instrumentation.ts is enabled by default in Next.js 15

  // Remove X-Powered-By header (minor security hardening)
  poweredByHeader: false,

  // Production image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers applied to every response
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control',  value: 'on' },
          { key: 'X-Frame-Options',         value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
