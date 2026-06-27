import type { NextConfig } from 'next';

// When building for Cloudflare Pages, stub out playwright-core so esbuild
// doesn't try to bundle the real package (which requires Node.js binaries).
const isCfBuild = process.env.CF_BUILD === '1';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { cpus: 2 },
  ...(isCfBuild ? {
    turbopack: {
      resolveAlias: {
        'playwright-core': './src/lib/_playwright-cf-stub.js',
        '@sparticuz/chromium-min': './src/lib/_playwright-cf-stub.js',
        'better-sqlite3': './src/lib/_playwright-cf-stub.js',
      },
    },
  } : {}),
  // Allow external images from news sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Compress output
  compress: true,
  // Production logging
  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;
