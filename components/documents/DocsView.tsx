'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
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
import { Modal } from '@/components/ui/modal';

type LinkOption = { id: string; title: string };

export function DocsView({
  documents,
  exploreItems,
}: {
  documents: DocumentDTO[];
  exploreItems: LinkOption[];
}) {
  const [optimistic, removeOptimistic] = useOptimistic(
    documents,
    (docs: DocumentDTO[], id: string) => docs.filter((d) => d.id !== id),
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
    return documentKindIds.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
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
          <p className="eyebrow text-muted mb-1">The travel wallet</p>
          <h1 className="font-display text-ink text-3xl font-semibold">Documents</h1>
          <p className="text-muted mt-1 text-sm">
            Tickets, bookings, IDs — private and yours. Served only over signed, expiring links.
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="size-4" aria-hidden /> Upload
        </Button>
      </div>

      {showUpload && (
        <UploadModal exploreItems={exploreItems} onClose={() => setShowUpload(false)} />
      )}

      {groups.length === 0 ? (
        <p className="border-border bg-surface/50 text-muted rounded-lg border border-dashed p-10 text-center">
          No documents yet — upload your first ticket or booking.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([kind, list]) => {
            const def = getDocumentKind(kind);
            const Icon = def.icon;
            return (
              <section
                key={kind}
                className="border-border bg-surface shadow-card rounded-lg border p-6"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="text-muted size-4" aria-hidden />
                  <h2 className="font-heading text-ink text-lg font-semibold">{def.label}</h2>
                  <span className="text-muted font-sans text-[11px]">
                    {String(list.length).padStart(2, '0')}
                  </span>
                </div>
                <ul className="divide-border divide-y">
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
      <span className="bg-canvas text-muted flex size-9 shrink-0 items-center justify-center rounded-md">
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-sm font-medium">{doc.fileName}</p>
        <p className="text-muted flex flex-wrap items-center gap-x-2 font-sans text-[11px]">
          <span>{formatBytes(doc.sizeBytes)}</span>
          {linkedTitle && (
            <span className="text-ink/70 inline-flex items-center gap-1">
              <Link2 className="size-3" aria-hidden /> {linkedTitle}
            </span>
          )}
          {doc.notes && <span className="truncate">· {doc.notes}</span>}
        </p>
      </div>

      {confirming ? (
        <span className="flex items-center gap-2">
          <span className="text-muted text-xs">Delete?</span>
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
            className="text-muted/60 hover:text-danger p-1.5 transition-colors"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </span>
      )}
    </li>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="text-muted hover:text-ink p-1.5 transition-colors"
    >
      {children}
    </a>
  );
}

function UploadModal({
  exploreItems,
  onClose,
}: {
  exploreItems: LinkOption[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<UploadDocState, FormData>(
    uploadDocument,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  return (
    <Modal title="Upload document" eyebrow="New document" onClose={onClose}>
      <form ref={ref} action={action} className="space-y-4 p-5">
        <div>
          <Label htmlFor="file">File</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept={DOCUMENT_ACCEPT}
            required
            className="text-ink file:border-border file:bg-canvas file:text-ink hover:file:border-ink/30 block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="text-muted mt-1 text-xs">PDF or image, up to 10 MB.</p>
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

        {state?.error && <p className="text-danger text-sm">{state.error}</p>}

        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Uploading…' : 'Upload document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
