'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Error boundary for authenticated routes — recoverable via reset, never leaks details. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app] route error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-card">
      <h1 className="font-display text-2xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        This page hit an unexpected error. You can try again — your data is safe.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={reset}>
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
      </div>
    </div>
  );
}
