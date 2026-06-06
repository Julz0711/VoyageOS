'use client';

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { Upload, Trash2, Eye, Download, Link2, FileText } from 'lucide-react';
import type { DocumentDTO } from '@/lib/dto';
import { uploadDocument, deleteDocument, type UploadDocState } from '@/lib/documents/actions';
import {
  documentKinds,
  documentKindIds,
  getDocumentKind,
  DOCUMENT_ACCEPT,
  formatBytes,
} from '@/config/documents';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type LinkOption = { id: string; title: string };

export function DocsView({
  documents,
  exploreItems,
}: {
  documents: DocumentDTO[];
  exploreItems: LinkOption[];
}) {
  const [optimistic, removeOptimistic] = useOptimistic(documents, (docs: DocumentDTO[], id: string) =>
    docs.filter((d) => d.id !== id),
  );
  const [, startTransition] = useTransition();
  const [showUpload, setShowUpload] = useState(false);

  const titleById = useMemo(
    () => new Map(exploreItems.map((i) => [i.id, i.title])),
    [exploreItems],
  );

  const groups = useMemo(() => {
    const map = new Map<string, DocumentDTO[]>();
    for (const doc of optimistic) {
      const list = map.get(doc.kind) ?? [];
      list.push(doc);
      map.set(doc.kind, list);
    }
    // Keep config order.
    return documentKindIds
      .filter((k) => map.has(k))
      .map((k) => [k, map.get(k)!] as const);
  }, [optimistic]);

  function onDelete(id: string) {
    startTransition(() => {
      removeOptimistic(id);
      void deleteDocument(id);
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 text-muted">The travel wallet</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Documents</h1>
          <p className="mt-1 text-sm text-muted">
            Tickets, bookings, IDs — private and yours. Served only over signed, expiring links.
          </p>
        </div>
        <Button variant={showUpload ? 'secondary' : 'primary'} onClick={() => setShowUpload((v) => !v)}>
          <Upload className="size-4" aria-hidden /> Upload
        </Button>
      </div>

      {showUpload && <UploadForm exploreItems={exploreItems} onDone={() => setShowUpload(false)} />}

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center text-muted">
          No documents yet — upload your first ticket or booking.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([kind, list]) => {
            const def = getDocumentKind(kind);
            const Icon = def.icon;
            return (
              <section key={kind} className="rounded-lg border border-border bg-surface p-6 shadow-card">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="size-4 text-muted" aria-hidden />
                  <h2 className="font-display text-lg font-semibold text-ink">{def.label}</h2>
                  <span className="font-mono text-[11px] text-muted">
                    {String(list.length).padStart(2, '0')}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {list.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      linkedTitle={doc.linkedItemId ? titleById.get(doc.linkedItemId) : undefined}
                      onDelete={onDelete}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  linkedTitle,
  onDelete,
}: {
  doc: DocumentDTO;
  linkedTitle?: string;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const href = `/api/documents/${doc.id}`;

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-canvas text-muted">
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{doc.fileName}</p>
        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
          <span>{formatBytes(doc.sizeBytes)}</span>
          {linkedTitle && (
            <span className="inline-flex items-center gap-1 text-ink/70">
              <Link2 className="size-3" aria-hidden /> {linkedTitle}
            </span>
          )}
          {doc.notes && <span className="truncate">· {doc.notes}</span>}
        </p>
      </div>

      {confirming ? (
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted">Delete?</span>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(doc.id)}>
            Delete
          </Button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1">
          <IconLink href={href} label="Preview">
            <Eye className="size-4" aria-hidden />
          </IconLink>
          <IconLink href={`${href}?dl=1`} label="Download">
            <Download className="size-4" aria-hidden />
          </IconLink>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Delete document"
            className="p-1.5 text-muted/60 transition-colors hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </span>
      )}
    </li>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="p-1.5 text-muted transition-colors hover:text-ink"
    >
      {children}
    </a>
  );
}

function UploadForm({ exploreItems, onDone }: { exploreItems: LinkOption[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<UploadDocState, FormData>(uploadDocument, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  return (
    <form ref={ref} action={action} className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div>
        <Label htmlFor="file">File</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept={DOCUMENT_ACCEPT}
          required
          className="block w-full text-sm text-ink file:mr-3 file:rounded-md file:border file:border-border file:bg-canvas file:px-3 file:py-1.5 file:text-sm file:text-ink hover:file:border-ink/30"
        />
        <p className="mt-1 text-xs text-muted">PDF or image, up to 10 MB.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="kind">Kind</Label>
          <Select id="kind" name="kind" defaultValue="ticket" className="w-full">
            {documentKindIds.map((k) => (
              <option key={k} value={k}>
                {documentKinds[k].label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="linkedItemId">Link to place (optional)</Label>
          <Select id="linkedItemId" name="linkedItemId" defaultValue="" className="w-full">
            <option value="">— none —</option>
            {exploreItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" placeholder="Confirmation #, seat, etc." maxLength={500} />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Uploading…' : 'Upload document'}
        </Button>
      </div>
    </form>
  );
}
