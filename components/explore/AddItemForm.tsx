'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addExploreItem, type AddItemState } from '@/lib/explore/actions';
import { categories } from '@/config/categories';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

const categoryList = Object.values(categories);
const selectClass =
  'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export function AddItemForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<AddItemState, FormData>(
    addExploreItem,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  return (
    <Modal title="Add place" eyebrow="New place" onClose={onClose}>
      <form ref={formRef} action={action} className="space-y-3 p-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required autoFocus placeholder="Lake Nisser beaches" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <select id="category" name="category" defaultValue="swim" className={selectClass}>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="band">Distance from base</Label>
            <select id="band" name="band" defaultValue="" className={selectClass}>
              <option value="">—</option>
              <option value="doorstep">Doorstep</option>
              <option value="≤15">≤15 min</option>
              <option value="≤45">≤45 min</option>
              <option value="daytrip">Day trip</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input id="subtitle" name="subtitle" placeholder="Sandy coves a stroll from the cabin." />
        </div>
        <div>
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input id="tags" name="tags" placeholder="wild swim, family" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <fieldset className="flex items-center gap-3">
            <legend className="sr-only">Weather fit</legend>
            <label className="text-ink flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="weatherFit"
                value="fine"
                className="size-4 accent-[var(--vos-color-primary)]"
              />
              Fine
            </label>
            <label className="text-ink flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="weatherFit"
                value="wet"
                className="size-4 accent-[var(--vos-color-primary)]"
              />
              Wet
            </label>
          </fieldset>
          <label className="text-ink flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              name="dontMiss"
              className="size-4 accent-[var(--vos-color-primary)]"
            />
            Don’t miss
          </label>
        </div>

        {state?.error && <p className="text-danger text-sm">{state.error}</p>}

        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Adding…' : 'Add place'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
