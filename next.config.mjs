/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  webpack: (config) => {
    // pdfjs-dist tries to optionally require canvas — stub it out
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
