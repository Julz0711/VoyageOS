'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) after the app mounts. Renders nothing.
 *
 * Only registers in production builds — a service worker caching dev assets would
 * serve stale HMR chunks and break local development.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    };

    // Defer until load so registration never competes with first paint.
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
