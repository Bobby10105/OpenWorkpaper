import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3', '@prisma/client'],
};

export default nextConfig;
