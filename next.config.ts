import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Openverse-proxied thumbnails for AI-sourced place photos.
    remotePatterns: [{ protocol: 'https', hostname: 'api.openverse.org' }],
  },
  experimental: {
    // Document uploads go through a server action; allow files up to the configured cap
    // (keep in sync with MAX_DOCUMENT_BYTES in config/documents.ts).
    serverActions: { bodySizeLimit: '12mb' },
  },
};

export default nextConfig;
