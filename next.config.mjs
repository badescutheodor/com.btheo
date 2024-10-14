import pkg from 'webpack';

const { DefinePlugin } = pkg;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["typeorm"],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.plugins.push(
        new DefinePlugin({
          'process.env.JWT_SECRET': `"${process.env.JWT_SECRET}"`,
        })
      )
    }

    return config;
  }
};

export default nextConfig;