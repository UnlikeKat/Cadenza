import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Allow importing from osmd-extended-master
    config.resolve.alias = {
      ...config.resolve.alias,
      '@osmd': path.resolve(__dirname, '../osmd-extended-master/src'),
    };
    
    return config;
  },
};

export default nextConfig;
