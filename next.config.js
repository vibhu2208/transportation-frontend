/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // PWA Configuration
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/_next/static/chunks/sw.js',
      },
    ];
  },
  // Enable static generation for service worker
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005',
  },
};

module.exports = nextConfig;
