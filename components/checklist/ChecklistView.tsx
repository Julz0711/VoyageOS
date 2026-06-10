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
import { Plus, CalendarClock } from 'lucide-react';
import type { ChecklistItemDTO, TripDTO } from '@/lib/dto';
import {
  addChecklistItem,
  updateChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  type AddChecklistState,
  type UpdateChecklistState,
} from '@/lib/checklist/actions';
import { tripCountdown } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ModalFooter } from '@/components/ui/modal-footer';
import { cn } from '@/lib/utils';

type Action = { type: 'toggle'; id: string; done: boolean } | { type: 'delete'; id: string };

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
  const [editing, setEditing] = useState<ChecklistItemDTO | null>(null);

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
          <p className="eyebrow text-muted mb-1">Before you go</p>
          <h1 className="font-display text-ink text-3xl font-semibold">Checklist</h1>
          <p className="text-muted mt-1 flex items-center gap-1.5 text-sm">
            <CalendarClock className="size-4" aria-hidden /> {countdown.label}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4" aria-hidden /> Add task
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="eyebrow text-muted">Progress</span>
          <span className="text-muted font-sans text-xs">
            {done}/{total} done · {pct}%
          </span>
        </div>
        <div className="rounded-pill bg-canvas h-2 w-full overflow-hidden">
          <div
            className="rounded-pill bg-success h-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
      {editing && (
        <EditTaskModal
          item={editing}
          onDelete={() => {
            onDelete(editing.id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {total === 0 ? (
        <p className="border-border bg-surface/50 text-muted rounded-lg border border-dashed p-10 text-center">
          Nothing to prep yet — add a task like “Check passport expiry”.
        </p>
      ) : (
        <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
          {sorted.map((item) => {
            const overdue = !item.done && item.dueDate != null && item.dueDate < today;
            return (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <input
                  id={`task-${item.id}`}
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => onToggle(item.id, e.target.checked)}
                  className="size-4 shrink-0 accent-[var(--vos-color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className={cn(
                    '-my-3 flex-1 py-3 text-left text-sm',
                    item.done ? 'text-muted line-through' : 'text-ink',
                  )}
                >
                  {item.label}
                  {item.dueDate && (
                    <span
                      className={cn(
                        'ml-2 font-sans text-[11px]',
                        overdue ? 'text-danger' : 'text-muted',
                      )}
                    >
                      {overdue ? 'overdue · ' : 'due '}
                      <span className="num">{item.dueDate}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EditTaskModal({
  item,
  onDelete,
  onClose,
}: {
  item: ChecklistItemDTO;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<UpdateChecklistState, FormData>(
    updateChecklistItem.bind(null, item.id),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Modal title="Edit task" eyebrow="Update task" onClose={onClose}>
      <form action={action} className="space-y-3 p-5">
        <div>
          <Label htmlFor="edit-label">Task</Label>
          <Input id="edit-label" name="label" required autoFocus defaultValue={item.label} />
        </div>
        <div>
          <Label htmlFor="edit-dueDate">Due (optional)</Label>
          <Input id="edit-dueDate" name="dueDate" type="date" defaultValue={item.dueDate ?? ''} />
        </div>
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <ModalFooter onDelete={onDelete} onCancel={onClose} confirmText="Delete this task?">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<AddChecklistState, FormData>(
    addChecklistItem,
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
    <Modal title="Add task" eyebrow="New task" onClose={onClose}>
      <form ref={ref} action={action} className="space-y-3 p-5">
        <div>
          <Label htmlFor="label">Task</Label>
          <Input id="label" name="label" required autoFocus placeholder="Check passport expiry" />
        </div>
        <div>
          <Label htmlFor="dueDate">Due (optional)</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" aria-hidden /> {pending ? 'Adding…' : 'Add task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
