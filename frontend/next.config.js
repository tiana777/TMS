/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Désactive le cache disque Webpack pour éviter l'erreur ZlibBase sous Node 24
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
