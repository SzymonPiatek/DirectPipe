import type { NextConfig } from 'next';

const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${wsUrl} ${apiUrl}`,
  "worker-src 'self' blob:",
  "img-src 'self' data:",
  "font-src 'self'",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Content-Security-Policy', value: csp }],
      },
    ];
  },
};

export default nextConfig;
