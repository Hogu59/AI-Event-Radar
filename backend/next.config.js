/** @type {import('next').NextConfig} */
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || 'https://aieventradar.vercel.app';

const nextConfig = {
  serverExternalPackages: ['cheerio'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: ALLOWED_ORIGIN },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
