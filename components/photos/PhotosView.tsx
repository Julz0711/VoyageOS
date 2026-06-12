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
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, X } from 'lucide-react';
import type { PhotoDTO } from '@/lib/dto';
import { uploadManyPhotos, updatePhoto, deletePhoto, type PhotoState } from '@/lib/photos/actions';
import { PHOTO_ACCEPT, MAX_PHOTO_MB, validatePhotoFile } from '@/config/photos';
import { getCategory, categoryColor } from '@/config/categories';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ModalFooter } from '@/components/ui/modal-footer';

type SortKey = 'day' | 'newest' | 'oldest' | 'place';
type LinkOption = { id: string; title: string; category: string };
type Group = { label: string; photos: PhotoDTO[] };

function dayLabel(day: string): string {
  try {
    return format(parseISO(day), 'd MMM yyyy');
  } catch {
    return day;
  }
}

function dayGroupLabel(day: string, tripDays: string[]): string {
  const idx = tripDays.indexOf(day);
  const formatted = format(parseISO(day), 'EEE d MMM');
  return idx >= 0 ? `Day ${idx + 1} · ${formatted}` : formatted;
}

function buildGroups(
  photos: PhotoDTO[],
  sort: SortKey,
  tripDays: string[],
  placeById: Map<string, LinkOption>,
): Group[] | null {
  if (sort === 'newest' || sort === 'oldest') return null;

  if (sort === 'day') {
    const buckets = new Map<string, PhotoDTO[]>();
    for (const p of photos) {
      const key = p.day ?? '__none__';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(p);
    }
    const groups: Group[] = [];
    for (const key of [...buckets.keys()].filter((k) => k !== '__none__').sort()) {
      groups.push({ label: dayGroupLabel(key, tripDays), photos: buckets.get(key)! });
    }
    if (buckets.has('__none__')) {
      groups.push({ label: 'Untagged', photos: buckets.get('__none__')! });
    }
    return groups;
  }

  if (sort === 'place') {
    const buckets = new Map<string, PhotoDTO[]>();
    for (const p of photos) {
      const key = p.linkedItemId ?? '__none__';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(p);
    }
    const groups: Group[] = [];
    const placeKeys = [...buckets.keys()]
      .filter((k) => k !== '__none__')
      .sort((a, b) =>
        (placeById.get(a)?.title ?? '').localeCompare(placeById.get(b)?.title ?? ''),
      );
    for (const key of placeKeys) {
      groups.push({ label: placeById.get(key)?.title ?? key, photos: buckets.get(key)! });
    }
    if (buckets.has('__none__')) {
      groups.push({ label: 'Untagged', photos: buckets.get('__none__')! });
    }
    return groups;
  }

  return null;
}

export function PhotosView({
  photos,
  exploreItems,
  days,
}: {
  photos: PhotoDTO[];
  exploreItems: LinkOption[];
  days: string[];
}) {
  const [optimistic, removeOptimistic] = useOptimistic(photos, (list: PhotoDTO[], id: string) =>
    list.filter((p) => p.id !== id),
  );
  const [, startTransition] = useTransition();
  const [sort, setSort] = useState<SortKey>('day');
  const [showUpload, setShowUpload] = useState(false);
  const [active, setActive] = useState<PhotoDTO | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const placeById = useMemo(() => new Map(exploreItems.map((i) => [i.id, i])), [exploreItems]);

  const sorted = useMemo((): PhotoDTO[] => {
    const list = [...optimistic];
    switch (sort) {
      case 'newest':
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      case 'oldest':
        return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'day':
        return list.sort((a, b) => {
          if (!a.day && !b.day) return a.createdAt.localeCompare(b.createdAt);
          if (!a.day) return 1;
          if (!b.day) return -1;
          return a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt);
        });
      case 'place':
        return list.sort((a, b) => {
          const pa = a.linkedItemId ? (placeById.get(a.linkedItemId)?.title ?? '') : '';
          const pb = b.linkedItemId ? (placeById.get(b.linkedItemId)?.title ?? '') : '';
          return pa.localeCompare(pb) || a.createdAt.localeCompare(b.createdAt);
        });
    }
  }, [optimistic, sort, placeById]);

  const groups = useMemo(
    () => buildGroups(sorted, sort, days, placeById),
    [sorted, sort, days, placeById],
  );

  const lightboxPhoto = useMemo(
    () => (lightboxId ? (sorted.find((p) => p.id === lightboxId) ?? null) : null),
    [lightboxId, sorted],
  );

  function onDelete(id: string) {
    startTransition(() => {
      removeOptimistic(id);
      void deletePhoto(id);
    });
  }

  function renderGrid(list: PhotoDTO[]) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <PhotoTile
            key={p.id}
            photo={p}
            place={p.linkedItemId ? placeById.get(p.linkedItemId) : undefined}
            onOpen={() => setLightboxId(p.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted mb-1">The album</p>
          <h1 className="font-display text-ink text-3xl font-semibold">Photos</h1>
          <p className="text-muted mt-1 text-sm">
            Upload trip photos and tag them to a place, a day, or a moment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {optimistic.length > 0 && (
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="day">By day</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="place">By place</option>
            </Select>
          )}
          <Button onClick={() => setShowUpload(true)}>
            <ImagePlus className="size-4" aria-hidden /> Add photos
          </Button>
        </div>
      </div>

      {showUpload && <UploadPhotosModal onClose={() => setShowUpload(false)} />}
      {active && (
        <PhotoEditModal
          photo={active}
          exploreItems={exploreItems}
          days={days}
          onDelete={() => {
            onDelete(active.id);
            setActive(null);
          }}
          onClose={() => setActive(null)}
        />
      )}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          list={sorted}
          placeById={placeById}
          onNavigate={setLightboxId}
          onEdit={(photo) => {
            setLightboxId(null);
            setActive(photo);
          }}
          onClose={() => setLightboxId(null)}
        />
      )}

      {optimistic.length === 0 ? (
        <p className="border-border bg-surface/50 text-muted rounded-lg border border-dashed p-10 text-center">
          No photos yet — add your first one.
        </p>
      ) : groups ? (
        <div>
          {groups.map((group, gi) => (
            <section key={group.label} className={cn(gi > 0 && 'mt-8')}>
              <div className="mb-4 flex items-center gap-3">
                <p className="eyebrow text-muted shrink-0">{group.label}</p>
                <div className="border-border flex-1 border-t" />
              </div>
              {renderGrid(group.photos)}
            </section>
          ))}
        </div>
      ) : (
        renderGrid(sorted)
      )}
    </div>
  );
}

// --- PhotoTile ---

function PhotoTile({
  photo,
  place,
  onOpen,
}: {
  photo: PhotoDTO;
  place?: LinkOption;
  onOpen: () => void;
}) {
  const PlaceIcon = place ? getCategory(place.category).icon : null;
  const caption = place?.title ?? photo.caption ?? (photo.day ? dayLabel(photo.day) : '');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group border-border bg-surface shadow-card hover:shadow-lift rounded-md border p-2 text-left transition-shadow"
    >
      <div className="bg-canvas relative aspect-square w-full overflow-hidden rounded-sm">
        <Image
          src={`/api/photos/${photo.id}`}
          alt={photo.caption ?? photo.fileName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized
          className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <figcaption className="text-ink mt-2 flex items-center justify-center gap-1 px-0.5 pb-0.5 text-center font-sans text-[11px]">
        {PlaceIcon && place && (
          <PlaceIcon
            className="size-3 shrink-0"
            style={{ color: categoryColor(place.category) }}
            aria-hidden
          />
        )}
        <span className="truncate">{caption || ' '}</span>
      </figcaption>
    </button>
  );
}

// --- Lightbox ---

function Lightbox({
  photo,
  list,
  placeById,
  onNavigate,
  onEdit,
  onClose,
}: {
  photo: PhotoDTO;
  list: PhotoDTO[];
  placeById: Map<string, LinkOption>;
  onNavigate: (id: string) => void;
  onEdit: (photo: PhotoDTO) => void;
  onClose: () => void;
}) {
  const idx = list.findIndex((p) => p.id === photo.id);
  const hasPrev = idx > 0;
  const hasNext = idx < list.length - 1;
  const place = photo.linkedItemId ? placeById.get(photo.linkedItemId) : undefined;
  const PlaceIcon = place ? getCategory(place.category).icon : null;
  const caption = place?.title ?? photo.caption ?? (photo.day ? dayLabel(photo.day) : '');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(list[idx - 1].id);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(list[idx + 1].id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, list, hasPrev, hasNext, onClose, onNavigate]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center gap-3 px-14 py-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* Image */}
        <div className="relative min-h-0 w-full flex-1">
          <Image
            src={`/api/photos/${photo.id}`}
            alt={caption || photo.fileName}
            fill
            unoptimized
            className="object-contain"
            sizes="100vw"
          />
        </div>

        {/* Caption + counter + edit */}
        <div className="flex w-full items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 text-sm text-white/70">
            {PlaceIcon && place && (
              <PlaceIcon
                className="size-3.5 shrink-0"
                style={{ color: categoryColor(place.category) }}
                aria-hidden
              />
            )}
            <span>{caption}</span>
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-sans text-xs text-white/30">
              {idx + 1} / {list.length}
            </span>
            <button
              type="button"
              onClick={() => onEdit(photo)}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </button>
          </div>
        </div>

        {/* Prev */}
        {hasPrev && (
          <button
            type="button"
            onClick={() => onNavigate(list[idx - 1].id)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {/* Next */}
        {hasNext && (
          <button
            type="button"
            onClick={() => onNavigate(list[idx + 1].id)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Next photo"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

// --- Upload modal (multi-file, no tags — add tags per-photo via edit) ---

function UploadPhotosModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(
    uploadManyPhotos,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    if (state?.ok && !state.error) {
      ref.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setFileCount(files.length);
    setFileErrors(files.map((f) => validatePhotoFile(f)).filter(Boolean) as string[]);
  }

  function onSubmit(e: { preventDefault(): void }) {
    if (fileCount === 0) {
      e.preventDefault();
      setFileErrors(['Choose at least one photo']);
    }
  }

  return (
    <Modal title="Add photos" eyebrow="Upload" onClose={onClose}>
      <form ref={ref} action={action} onSubmit={onSubmit} className="space-y-4 p-5">
        <div>
          <Label htmlFor="files">Photos</Label>
          <input
            id="files"
            name="file"
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            required
            onChange={onFileChange}
            className="text-ink file:border-border file:bg-canvas file:text-ink hover:file:border-ink/30 block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm"
          />
          {fileErrors.length > 0 ? (
            <ul className="text-danger mt-1 space-y-0.5 text-xs">
              {fileErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mt-1 text-xs">
              JPEG, PNG, WebP or HEIC · up to {MAX_PHOTO_MB} MB each · select multiple files to
              batch upload, then tag each one individually.
            </p>
          )}
        </div>
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || fileCount === 0 || fileErrors.length > 0}>
            {pending ? 'Uploading…' : fileCount > 1 ? `Upload ${fileCount} photos` : 'Upload photo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Edit modal ---

function PhotoEditModal({
  photo,
  exploreItems,
  days,
  onDelete,
  onClose,
}: {
  photo: PhotoDTO;
  exploreItems: LinkOption[];
  days: string[];
  onDelete: () => void;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(
    updatePhoto.bind(null, photo.id),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Modal
      title={photo.caption || 'Photo'}
      eyebrow="Photo"
      onClose={onClose}
      panelClassName="max-w-xl"
    >
      <form action={action} className="space-y-4 p-5">
        <div className="bg-canvas relative h-[46vh] w-full overflow-hidden rounded-md">
          <Image
            src={`/api/photos/${photo.id}`}
            alt={photo.caption ?? photo.fileName}
            fill
            sizes="640px"
            unoptimized
            className="object-contain"
          />
        </div>
        <PhotoTagFields photo={photo} exploreItems={exploreItems} days={days} />
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <ModalFooter onDelete={onDelete} onCancel={onClose} confirmText="Delete this photo?">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// --- Shared tag fields ---

function PhotoTagFields({
  photo,
  exploreItems,
  days,
}: {
  photo?: PhotoDTO;
  exploreItems: LinkOption[];
  days: string[];
}) {
  return (
    <>
      <div>
        <Label htmlFor="caption">Moment (optional)</Label>
        <Input
          id="caption"
          name="caption"
          defaultValue={photo?.caption ?? ''}
          placeholder="e.g. Sunset swim"
          maxLength={280}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="linkedItemId">Place (optional)</Label>
          <Select
            id="linkedItemId"
            name="linkedItemId"
            defaultValue={photo?.linkedItemId ?? ''}
            className="w-full"
          >
            <option value="">— none —</option>
            {exploreItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="day">Day (optional)</Label>
          <Select id="day" name="day" defaultValue={photo?.day ?? ''} className="w-full">
            <option value="">— none —</option>
            {days.map((d, i) => (
              <option key={d} value={d}>
                Day {i + 1} · {format(parseISO(d), 'EEE d MMM')}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </>
  );
}
