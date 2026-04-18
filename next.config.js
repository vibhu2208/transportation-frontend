/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // PWA Configuration
  async redirects() {
    return [
      {
        source: '/admin/dashboard/invoices',
        destination: '/admin/dashboard?tab=invoices',
        permanent: true,
      },
      {
        source: '/admin/dashboard/money-receipts',
        destination: '/admin/dashboard?tab=moneyReceipt',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
    return [
      {
        source: '/sw.js',
        destination: '/_next/static/chunks/sw.js',
      },
      // Browser calls same origin → Next forwards to Nest (fixes "Cannot POST" when API URL pointed at Next by mistake)
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
