import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Transpile OSMD source files
  transpilePackages: [],
  
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
    
    // Ensure OSMD TypeScript files are processed
    const osmdPath = path.resolve(__dirname, '../osmd-extended-master/src');
    config.module.rules.push({
      test: /\.tsx?$/,
      include: [osmdPath],
      use: {
        loader: 'next/dist/compiled/babel/loader',
        options: {
          presets: ['next/babel'],
        },
      },
    });
    
    return config;
  },
};

export default nextConfig;
