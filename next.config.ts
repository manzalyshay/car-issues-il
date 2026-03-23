import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
