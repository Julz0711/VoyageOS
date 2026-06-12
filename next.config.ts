import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Openverse-proxied thumbnails for AI-sourced place photos.
    remotePatterns: [{ protocol: 'https', hostname: 'api.openverse.org' }],
  },
  experimental: {
    // Document + photo uploads go through server actions; the cap must exceed the largest file
    // limit plus multipart overhead (MAX_PHOTO_BYTES in config/photos.ts, MAX_DOCUMENT_BYTES).
    serverActions: { bodySizeLimit: '16mb' },
  },
};

export default nextConfig;
