'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { deleteTrip } from '@/lib/trips/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DeleteTripButton({
  tripId,
  tripName,
  className,
  redirectTo,
}: {
  tripId: string;
  tripName: string;
  className?: string;
  /** Where to navigate after a successful delete (e.g. from the summary page → '/dashboard'). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      await deleteTrip(tripId);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${tripName}`}
        className={cn(
          'shrink-0 rounded-md p-1.5 text-muted/60 transition-colors hover:bg-danger/10 hover:text-danger',
          className,
        )}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => !pending && setOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lift"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-ink">Delete trip?</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                disabled={pending}
                className="text-muted hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              This permanently removes <span className="font-medium text-ink">{tripName}</span> and
              all its places, plan, packing list, documents, and chat. This can’t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDelete} disabled={pending}>
                {pending ? 'Deleting…' : 'Delete trip'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
