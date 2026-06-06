'use client';

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { Plus, Trash2, CalendarClock } from 'lucide-react';
import type { ChecklistItemDTO, TripDTO } from '@/lib/dto';
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  type AddChecklistState,
} from '@/lib/checklist/actions';
import { tripCountdown } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Action =
  | { type: 'toggle'; id: string; done: boolean }
  | { type: 'delete'; id: string };

function reducer(items: ChecklistItemDTO[], action: Action): ChecklistItemDTO[] {
  switch (action.type) {
    case 'toggle':
      return items.map((i) => (i.id === action.id ? { ...i, done: action.done } : i));
    case 'delete':
      return items.filter((i) => i.id !== action.id);
  }
}

export function ChecklistView({ trip, items }: { trip: TripDTO; items: ChecklistItemDTO[] }) {
  const [optimistic, apply] = useOptimistic(items, reducer);
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const countdown = tripCountdown(trip.dateStart, trip.dateEnd);

  const done = optimistic.filter((i) => i.done).length;
  const total = optimistic.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Sort: open items first (by due date), then done items.
  const sorted = useMemo(() => {
    return [...optimistic].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.order - b.order;
    });
  }, [optimistic]);

  function onToggle(id: string, next: boolean) {
    startTransition(() => {
      apply({ type: 'toggle', id, done: next });
      void toggleChecklistItem(id, next);
    });
  }
  function onDelete(id: string) {
    startTransition(() => {
      apply({ type: 'delete', id });
      void deleteChecklistItem(id);
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 text-muted">Before you go</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Checklist</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <CalendarClock className="size-4" aria-hidden /> {countdown.label}
          </p>
        </div>
        <Button variant={showAdd ? 'secondary' : 'primary'} onClick={() => setShowAdd((v) => !v)}>
          <Plus className="size-4" aria-hidden /> Add task
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="eyebrow text-muted">Progress</span>
          <span className="font-mono text-xs text-muted">
            {done}/{total} done · {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-canvas">
          <div className="h-full rounded-pill bg-success transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {showAdd && <AddTaskForm onDone={() => setShowAdd(false)} />}

      {total === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center text-muted">
          Nothing to prep yet — add a task like “Check passport expiry”.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {sorted.map((item) => {
            const overdue = !item.done && item.dueDate != null && item.dueDate < today;
            return (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <input
                  id={`task-${item.id}`}
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => onToggle(item.id, e.target.checked)}
                  className="size-4 accent-[var(--vos-color-primary)]"
                />
                <label
                  htmlFor={`task-${item.id}`}
                  className={cn('flex-1 text-sm', item.done ? 'text-muted line-through' : 'text-ink')}
                >
                  {item.label}
                  {item.dueDate && (
                    <span className={cn('ml-2 font-mono text-[11px]', overdue ? 'text-danger' : 'text-muted')}>
                      {overdue ? 'overdue · ' : 'due '}
                      {item.dueDate}
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  aria-label="Delete task"
                  className="shrink-0 p-1 text-muted/60 transition-colors hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddTaskForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<AddChecklistState, FormData>(addChecklistItem, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  return (
    <form ref={ref} action={action} className="grid gap-3 rounded-lg border border-border bg-surface p-5 sm:grid-cols-[1fr_auto_auto]">
      <div>
        <Label htmlFor="label">Task</Label>
        <Input id="label" name="label" required placeholder="Check passport expiry" />
      </div>
      <div>
        <Label htmlFor="dueDate">Due (optional)</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-danger sm:col-span-3">{state.error}</p>}
    </form>
  );
}
