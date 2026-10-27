import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@titipin/shared'],
  output: 'standalone',
};

export default nextConfig;
