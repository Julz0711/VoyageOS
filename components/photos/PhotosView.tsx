'use client';

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ImagePlus, MapPin, CalendarDays } from 'lucide-react';
import type { PhotoDTO } from '@/lib/dto';
import { uploadPhoto, updatePhoto, deletePhoto, type PhotoState } from '@/lib/photos/actions';
import { PHOTO_ACCEPT, MAX_PHOTO_MB, validatePhotoFile } from '@/config/photos';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ModalFooter } from '@/components/ui/modal-footer';

type LinkOption = { id: string; title: string };

function dayLabel(day: string, days: string[]): string {
  const idx = days.indexOf(day);
  try {
    const d = format(parseISO(day), 'EEE d MMM');
    return idx >= 0 ? `Day ${idx + 1} · ${d}` : d;
  } catch {
    return day;
  }
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
  const [showUpload, setShowUpload] = useState(false);
  const [active, setActive] = useState<PhotoDTO | null>(null);

  const titleById = useMemo(() => new Map(exploreItems.map((i) => [i.id, i.title])), [exploreItems]);

  function onDelete(id: string) {
    startTransition(() => {
      removeOptimistic(id);
      void deletePhoto(id);
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted mb-1">The album</p>
          <h1 className="font-display text-ink text-3xl font-semibold">Photos</h1>
          <p className="text-muted mt-1 text-sm">
            Upload trip photos and tag them to a place, a day, or a moment. They’ll feature in your
            trip recap.
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <ImagePlus className="size-4" aria-hidden /> Add photo
        </Button>
      </div>

      {showUpload && (
        <UploadPhotoModal
          exploreItems={exploreItems}
          days={days}
          onClose={() => setShowUpload(false)}
        />
      )}
      {active && (
        <PhotoModal
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

      {optimistic.length === 0 ? (
        <p className="border-border bg-surface/50 text-muted rounded-lg border border-dashed p-10 text-center">
          No photos yet — add your first one.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {optimistic.map((p) => (
            <PhotoTile
              key={p.id}
              photo={p}
              placeTitle={p.linkedItemId ? titleById.get(p.linkedItemId) : undefined}
              days={days}
              onOpen={() => setActive(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  placeTitle,
  days,
  onOpen,
}: {
  photo: PhotoDTO;
  placeTitle?: string;
  days: string[];
  onOpen: () => void;
}) {
  const tag = placeTitle ?? photo.caption ?? (photo.day ? dayLabel(photo.day, days) : null);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group border-border bg-canvas relative aspect-square overflow-hidden rounded-lg border"
    >
      <Image
        src={`/api/photos/${photo.id}`}
        alt={photo.caption ?? photo.fileName}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        unoptimized
        className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />
      {tag && (
        <span className="from-ink/70 absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t to-transparent p-2 text-left font-sans text-[11px] text-white">
          {placeTitle ? (
            <MapPin className="size-3 shrink-0" aria-hidden />
          ) : photo.caption ? null : (
            <CalendarDays className="size-3 shrink-0" aria-hidden />
          )}
          <span className="truncate">{tag}</span>
        </span>
      )}
    </button>
  );
}

function UploadPhotoModal({
  exploreItems,
  days,
  onClose,
}: {
  exploreItems: LinkOption[];
  days: string[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<PhotoState, FormData>(uploadPhoto, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setHasFile(Boolean(file));
    setFileError(file ? validatePhotoFile(file) : null);
  }

  // Block the submit (and the wasted upload) when the client-side check fails.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const file = ref.current?.querySelector<HTMLInputElement>('input[name="file"]')?.files?.[0];
    const err = file ? validatePhotoFile(file) : 'Choose a photo to upload';
    if (err) {
      e.preventDefault();
      setFileError(err);
    }
  }

  return (
    <Modal title="Add photo" eyebrow="New photo" onClose={onClose}>
      <form ref={ref} action={action} onSubmit={onSubmit} className="space-y-4 p-5">
        <div>
          <Label htmlFor="file">Photo</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept={PHOTO_ACCEPT}
            required
            onChange={onFileChange}
            className="text-ink file:border-border file:bg-canvas file:text-ink hover:file:border-ink/30 block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm"
          />
          {fileError ? (
            <p className="text-danger mt-1 text-xs">{fileError}</p>
          ) : (
            <p className="text-muted mt-1 text-xs">JPEG, PNG, WebP or HEIC, up to {MAX_PHOTO_MB} MB.</p>
          )}
        </div>
        <PhotoTagFields exploreItems={exploreItems} days={days} />
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !hasFile || fileError != null}>
            {pending ? 'Uploading…' : 'Upload photo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PhotoModal({
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
    <Modal title={photo.caption || 'Photo'} eyebrow="Photo" onClose={onClose} panelClassName="max-w-xl">
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

/** Shared caption / place / day tag inputs (used by both upload and edit). */
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
