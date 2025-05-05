import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['images.unsplash.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.co.th',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
