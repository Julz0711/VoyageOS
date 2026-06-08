'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * App-wide modal: a bottom sheet on phones (anchored, rounded top) and a centered
 * dialog on `sm+`. Closes on tap-away, Escape, or the header ✕. The form/content is
 * passed as children; callers own their own submit + footer buttons.
 */
export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  panelClassName,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Override the panel max-width (default `max-w-md`). */
  panelClassName?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="bg-ink/30 fixed inset-0 z-50 flex items-end justify-center backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          'border-border bg-surface shadow-lift max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border pb-[env(safe-area-inset-bottom)] md:rounded-lg md:pb-0',
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="border-border bg-surface sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4">
          <div>
            {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
            <h2 className="font-heading text-ink text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink -mr-1 p-1.5 transition-colors"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
