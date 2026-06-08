import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Mark pg as server-only
  serverExternalPackages: ['pg'],
  
  env: {
    NEXT_PUBLIC_APP_NAME: 'Oak Ledger',
    NEXT_PUBLIC_APP_VERSION: '2.0.0',
  },
};

export default nextConfig;