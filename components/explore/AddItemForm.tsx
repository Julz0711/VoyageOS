'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addExploreItem, type AddItemState } from '@/lib/explore/actions';
import { categories } from '@/config/categories';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const categoryList = Object.values(categories);

export function AddItemForm({ onAdded }: { onAdded?: () => void }) {
  const [state, action, pending] = useActionState<AddItemState, FormData>(addExploreItem, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      onAdded?.();
    }
  }, [state, onAdded]);

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Lake Nisser beaches" />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue="swim"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="band">Distance from base</Label>
          <select
            id="band"
            name="band"
            defaultValue=""
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="">—</option>
            <option value="doorstep">Doorstep</option>
            <option value="≤15">≤15 min</option>
            <option value="≤45">≤45 min</option>
            <option value="daytrip">Day trip</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input id="subtitle" name="subtitle" placeholder="Sandy coves a stroll from the cabin." />
        </div>
        <div>
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input id="tags" name="tags" placeholder="wild swim, family" />
        </div>
        <div className="flex items-end gap-4">
          <fieldset className="flex items-center gap-3">
            <legend className="sr-only">Weather fit</legend>
            <label className="flex items-center gap-1 text-sm text-ink">
              <input type="checkbox" name="weatherFit" value="fine" /> Fine
            </label>
            <label className="flex items-center gap-1 text-sm text-ink">
              <input type="checkbox" name="weatherFit" value="wet" /> Wet
            </label>
          </fieldset>
          <label className="flex items-center gap-1 text-sm text-ink">
            <input type="checkbox" name="dontMiss" /> Don’t miss
          </label>
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add place'}
        </Button>
      </div>
    </form>
  );
}
