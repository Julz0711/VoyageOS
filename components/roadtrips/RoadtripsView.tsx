'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, X, Route, Navigation, Search, Pencil } from 'lucide-react';
import type { RoadtripDTO } from '@/lib/dto';
import { createRoadtrip, updateRoadtrip, deleteRoadtrip } from '@/lib/roadtrips/actions';
import { getCategory } from '@/config/categories';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

type Candidate = { id: string; title: string; category: string };
type Base = { lat: number; lng: number; label: string };

/** Google Maps route that starts and ends at the cabin (base) for a clean round-trip loop. */
function directionsHref(base: Base, stops: { lat?: number; lng?: number }[]): string | null {
  const pts = stops.filter((s) => s.lat != null && s.lng != null).map((s) => `${s.lat},${s.lng}`);
  if (pts.length === 0) return null;
  const origin = `${base.lat},${base.lng}`;
  return `https://www.google.com/maps/dir/${origin}/${pts.join('/')}/${origin}`;
}

export function RoadtripsView({
  roadtrips,
  candidates,
  base,
}: {
  roadtrips: RoadtripDTO[];
  candidates: Candidate[];
  base: Base;
}) {
  const [optimistic, removeOptimistic] = useOptimistic(roadtrips, (list: RoadtripDTO[], id: string) =>
    list.filter((r) => r.id !== id),
  );
  const [, startTransition] = useTransition();
  // null = closed; { } = new; { roadtrip } = editing that one.
  const [editor, setEditor] = useState<{ roadtrip?: RoadtripDTO } | null>(null);

  function onDelete(id: string) {
    startTransition(() => {
      removeOptimistic(id);
      void deleteRoadtrip(id);
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 text-muted">Chart a route</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Roadtrips</h1>
          <p className="mt-1 text-sm text-muted">
            String your places into an ordered route. Each roadtrip also shows up in Explore.
          </p>
        </div>
        <Button
          variant={editor ? 'secondary' : 'primary'}
          onClick={() => setEditor((e) => (e ? null : {}))}
        >
          <Plus className="size-4" aria-hidden /> New roadtrip
        </Button>
      </div>

      {editor && (
        <Builder
          key={editor.roadtrip?.id ?? 'new'}
          candidates={candidates}
          editing={editor.roadtrip}
          onDone={() => setEditor(null)}
        />
      )}

      {optimistic.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center text-muted">
          No roadtrips yet — build one from your Explore places.
        </p>
      ) : (
        <div className="space-y-4">
          {optimistic.map((rt) => {
            const href = directionsHref(base, rt.stops);
            return (
              <section key={rt.id} className="rounded-lg border border-border bg-surface p-6 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      <Route className="size-4 text-muted" aria-hidden /> {rt.name}
                    </h2>
                    {rt.notes && <p className="mt-0.5 text-sm text-muted">{rt.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer" title="Open route in Google Maps">
                        <Button variant="ghost" size="icon">
                          <Navigation className="size-4" aria-hidden />
                        </Button>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditor({ roadtrip: rt })}
                      aria-label="Edit roadtrip"
                      className="p-1.5 text-muted/60 transition-colors hover:text-ink"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <DeleteButton onConfirm={() => onDelete(rt.id)} />
                  </div>
                </div>
                <p className="mb-1.5 font-mono text-[11px] text-muted">
                  Round trip from {base.label}
                </p>
                <ol className="space-y-1.5">
                  {rt.stops.map((s, i) => {
                    const Icon = getCategory(s.category).icon;
                    return (
                      <li key={s.id} className="flex items-center gap-2.5 text-sm text-ink">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas font-mono text-[10px] text-muted">
                          {i + 1}
                        </span>
                        <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
                        <span className="truncate">{s.title}</span>
                        {s.areaLabel && (
                          <span className="truncate font-mono text-[11px] text-muted">· {s.areaLabel}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Builder({
  candidates,
  editing,
  onDone,
}: {
  candidates: Candidate[];
  editing?: RoadtripDTO;
  onDone: () => void;
}) {
  const [, startTransition] = useTransition();
  const candidateIds = useMemo(() => new Set(candidates.map((c) => c.id)), [candidates]);
  const [name, setName] = useState(editing?.name ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [selected, setSelected] = useState<string[]>(
    editing ? editing.stops.map((s) => s.id).filter((id) => candidateIds.has(id)) : [],
  );
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const available = useMemo(
    () =>
      candidates.filter(
        (c) => !selected.includes(c.id) && c.title.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [candidates, selected, query],
  );

  function add(id: string) {
    setSelected((s) => [...s, id]);
  }
  function remove(id: string) {
    setSelected((s) => s.filter((x) => x !== id));
  }
  function move(i: number, dir: -1 | 1) {
    setSelected((s) => {
      const next = [...s];
      const j = i + dir;
      if (j < 0 || j >= next.length) return s;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    setError(null);
    if (!name.trim()) return setError('Name your roadtrip');
    if (selected.length < 2) return setError('Pick at least two stops');
    setSaving(true);
    const payload = { name: name.trim(), notes: notes.trim() || undefined, stopIds: selected };
    startTransition(async () => {
      const res = editing ? await updateRoadtrip(editing.id, payload) : await createRoadtrip(payload);
      setSaving(false);
      if (res.ok) onDone();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rt-name">Name</Label>
          <Input id="rt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="South coast loop" />
        </div>
        <div>
          <Label htmlFor="rt-notes">Notes (optional)</Label>
          <Input id="rt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Best over 2 days" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Route (selected, ordered) */}
        <div>
          <p className="eyebrow mb-2 text-muted">Route ({selected.length})</p>
          {selected.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted">
              Add places from the right, then reorder them into your route.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {selected.map((id, i) => {
                const c = byId.get(id);
                if (!c) return null;
                const Icon = getCategory(c.category).icon;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-md border border-border bg-canvas/40 p-2">
                    <span className="font-mono text-[11px] text-muted">{i + 1}</span>
                    <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.title}</span>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="p-1 text-muted hover:text-ink disabled:opacity-30">
                      <ArrowUp className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label="Move down" className="p-1 text-muted hover:text-ink disabled:opacity-30">
                      <ArrowDown className="size-3.5" aria-hidden />
                    </button>
                    <button type="button" onClick={() => remove(id)} aria-label="Remove" className="p-1 text-muted hover:text-danger">
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Available places */}
        <div>
          <p className="eyebrow mb-2 text-muted">Your places</p>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search places…" className="pl-9" />
          </div>
          <ul className="max-h-64 space-y-1 overflow-auto">
            {available.length === 0 ? (
              <li className="px-1 py-2 text-sm text-muted">No more places to add.</li>
            ) : (
              available.map((c) => {
                const Icon = getCategory(c.category).icon;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => add(c.id)}
                      className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-ink hover:bg-canvas"
                    >
                      <Plus className="size-3.5 shrink-0 text-muted" aria-hidden />
                      <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
                      <span className="truncate">{c.title}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Save roadtrip'}
        </Button>
      </div>
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <Button variant="danger" size="sm" onClick={onConfirm}>Delete</Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} aria-label="Delete roadtrip" className="p-1.5 text-muted/60 hover:text-danger">
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
