'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Standard modal footer: an optional Delete on the left, Cancel + the primary action (passed as
 * children) on the right. Pressing Delete swaps the whole row for an inline confirm — Cancel and
 * the primary action disappear so the only choices are "Cancel" or "Delete". Coherent app-wide.
 */
export function ModalFooter({
  onDelete,
  onCancel,
  confirmText = 'Delete this?',
  children,
}: {
  onDelete?: () => void;
  onCancel: () => void;
  confirmText?: string;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border-border flex items-center gap-2 border-t pt-4">
      {confirming ? (
        <>
          <span className="text-muted text-sm">{confirmText}</span>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </>
      ) : (
        <>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(true)}
              className="text-muted hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            {children}
          </div>
        </>
      )}
    </div>
  );
}
