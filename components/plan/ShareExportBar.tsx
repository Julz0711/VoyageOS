'use client';

import { useState, useTransition } from 'react';
import { Download, Share2, Copy, Check, X, ExternalLink } from 'lucide-react';
import { enableSharing, disableSharing } from '@/lib/trips/actions';
import { Button } from '@/components/ui/button';

export function ShareExportBar({ shareToken }: { shareToken?: string }) {
  const [token, setToken] = useState<string | undefined>(shareToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const shareUrl =
    token && typeof window !== 'undefined' ? `${window.location.origin}/share/${token}` : '';

  function enable() {
    startTransition(async () => {
      const res = await enableSharing();
      if ('token' in res) setToken(res.token);
    });
  }
  function disable() {
    startTransition(async () => {
      await disableSharing();
      setToken(undefined);
      setCopied(false);
    });
  }
  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select the link manually */
    }
  }

  return (
    <div className="border-border bg-surface shadow-card space-y-2 rounded-lg border p-3">
      {/* Action row: export + share toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/calendar" download>
          <Button variant="secondary" size="sm">
            <Download className="size-4" aria-hidden /> Export .ics
          </Button>
        </a>

        {!token ? (
          <Button variant="secondary" size="sm" onClick={enable} disabled={pending}>
            <Share2 className="size-4" aria-hidden /> {pending ? 'Creating…' : 'Create share link'}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={disable} disabled={pending}>
            <X className="size-4" aria-hidden /> Stop sharing
          </Button>
        )}
      </div>

      {/* Share link on its own row so it never collides with the buttons on narrow screens */}
      {token && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="border-border bg-canvas/40 text-ink h-9 min-w-0 flex-1 rounded-md border px-3 font-sans text-xs"
            aria-label="Share link"
          />
          <Button variant="secondary" size="sm" onClick={copy} className="shrink-0">
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open share page"
            title="Open"
            className="shrink-0"
          >
            <Button variant="ghost" size="icon">
              <ExternalLink className="size-4" aria-hidden />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
