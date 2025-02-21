/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['cdn.shopify.com'], // Autorise les images de Shopify
  },
};

module.exports = nextConfig;