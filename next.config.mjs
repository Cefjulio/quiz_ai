/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "officeparser", "pdfjs-dist", "pdf-lib"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack: (config) => {
    // react-pdf uses canvas optionally; alias it away to prevent build errors
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
