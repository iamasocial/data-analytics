/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*', // Matches any request starting with /api/
        destination: 'http://localhost:8080/api/:path*', // Proxies to your Go backend
      },
    ];
  },
}

export default nextConfig
