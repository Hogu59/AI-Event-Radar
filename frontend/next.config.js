/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.festa.io' },
      { protocol: 'https', hostname: 'festa.io' },
      { protocol: 'https', hostname: '**.event-us.kr' },
      { protocol: 'https', hostname: 'event-us.kr' },
      { protocol: 'https', hostname: '**.luma.com' },
      { protocol: 'https', hostname: 'luma.com' },
      { protocol: 'https', hostname: 'lu.ma' },
      { protocol: 'https', hostname: '**.lu.ma' },
      { protocol: 'https', hostname: 'cdn.lu.ma' },
      { protocol: 'https', hostname: 'images.lumacdn.com' },
      { protocol: 'https', hostname: '**.devpost.com' },
      { protocol: 'https', hostname: 'devpost.com' },
      { protocol: 'https', hostname: 'challengepost-files-prod.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
    ],
  },
};

module.exports = nextConfig;
