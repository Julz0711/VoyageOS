'use client';

import { useState, useTransition } from 'react';
import { deleteAccount } from '@/lib/auth/deleteAccount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();

  const CONFIRM_WORD = 'DELETE';
  const canSubmit = confirm === CONFIRM_WORD && !pending;

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-danger hover:text-danger/80 text-sm font-medium transition-colors"
      >
        Delete account
      </button>

      {open && (
        <Modal title="Delete your account" eyebrow="Permanent action" onClose={() => setOpen(false)}>
          <div className="space-y-4 p-5">
            <div className="bg-danger/8 border-danger/20 rounded-lg border p-4">
              <p className="text-danger text-sm font-medium">This cannot be undone.</p>
              <p className="text-danger/80 mt-1 text-sm">
                All your trips, photos, documents, plans, and account data will be permanently
                deleted from our servers. We cannot recover it.
              </p>
            </div>

            <div>
              <p className="text-ink mb-2 text-sm">
                Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm:
              </p>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="border-border flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!canSubmit}
                onClick={handleDelete}
              >
                {pending ? 'Deleting…' : 'Delete everything'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
