'use client';
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useOptimistic,
  useState,
  useTransition,
} from 'react';
import { Plus, Trash2, RotateCcw, Pencil, Check, X } from 'lucide-react';
import type { PackingItemDTO } from '@/lib/dto';
import {
  togglePacked,
  deletePackingItem,
  resetPacking,
  addPackingItem,
  updatePackingItem,
  type AddPackingState,
} from '@/lib/packing/actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';

const NEW_GROUP = '__new__';

type Action =
  | { type: 'toggle'; id: string; packed: boolean }
  | { type: 'delete'; id: string }
  | { type: 'edit'; id: string; patch: Partial<PackingItemDTO> }
  | { type: 'reset' };

function reducer(items: PackingItemDTO[], action: Action): PackingItemDTO[] {
  switch (action.type) {
    case 'toggle':
      return items.map((i) => (i.id === action.id ? { ...i, packed: action.packed } : i));
    case 'delete':
      return items.filter((i) => i.id !== action.id);
    case 'edit':
      return items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i));
    case 'reset':
      return items.map((i) => ({ ...i, packed: false }));
  }
}

export function PackView({ items }: { items: PackingItemDTO[] }) {
  const [optimisticItems, apply] = useOptimistic(items, reducer);
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, PackingItemDTO[]>();
    for (const item of optimisticItems) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [optimisticItems]);

  const groupNames = useMemo(() => groups.map(([name]) => name), [groups]);

  const total = optimisticItems.length;
  const packed = optimisticItems.filter((i) => i.packed).length;
  const pct = total ? Math.round((packed / total) * 100) : 0;

  function onToggle(id: string, next: boolean) {
    startTransition(() => {
      apply({ type: 'toggle', id, packed: next });
      void togglePacked(id, next);
    });
  }
  function onDelete(id: string) {
    startTransition(() => {
      apply({ type: 'delete', id });
      void deletePackingItem(id);
    });
  }
  function onReset() {
    startTransition(() => {
      apply({ type: 'reset' });
      void resetPacking();
    });
  }
  function onEdit(
    id: string,
    patch: { category?: string; label?: string; quantityHint?: string | null; essential?: boolean },
  ) {
    startTransition(() => {
      apply({
        type: 'edit',
        id,
        patch: { ...patch, quantityHint: patch.quantityHint ?? undefined },
      });
      void updatePackingItem(id, patch);
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted mb-1">The kit list</p>
          <h1 className="font-display text-3xl font-semibold">Pack</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onReset} disabled={!packed}>
            <RotateCcw className="size-4" aria-hidden /> Reset all
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="size-4" aria-hidden /> Add item
          </Button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="eyebrow text-muted">Overall</span>
          <span className="text-muted font-sans text-xs">
            {packed}/{total} packed · {pct}%
          </span>
        </div>
        <Progress value={pct} />
      </div>

      {showAdd && <AddPackingModal groups={groupNames} onClose={() => setShowAdd(false)} />}

      {groups.length === 0 ? (
        <p className="border-border bg-surface text-muted rounded-lg border p-8 text-center">
          Nothing to pack yet — add your first item.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(([group, list]) => {
            const groupPacked = list.filter((i) => i.packed).length;
            return (
              <section
                key={group}
                className="border-border bg-surface shadow-card rounded-lg border p-6"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-heading text-ink text-lg font-semibold">{group}</h2>
                  <span className="text-muted font-sans text-[11px]">
                    {String(groupPacked).padStart(2, '0')}/{String(list.length).padStart(2, '0')}
                  </span>
                </div>
                <ul className="divide-border divide-y">
                  {list.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      groups={groupNames}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={onEdit}
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

function ItemRow({
  item,
  groups,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: PackingItemDTO;
  groups: string[];
  onToggle: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    patch: { category?: string; label?: string; quantityHint?: string | null; essential?: boolean },
  ) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-2">
        <EditRow
          item={item}
          groups={groups}
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            onEdit(item.id, patch);
            setEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 py-2">
      <input
        id={`pack-${item.id}`}
        type="checkbox"
        checked={item.packed}
        onChange={(e) => onToggle(item.id, e.target.checked)}
        className="size-4 accent-[var(--vos-color-primary)]"
      />
      <label
        htmlFor={`pack-${item.id}`}
        className={cn('flex-1 text-sm', item.packed ? 'text-muted line-through' : 'text-ink')}
      >
        {item.label}
        {item.quantityHint && <span className="text-muted"> · {item.quantityHint}</span>}
        {item.essential && !item.packed && (
          <span className="bg-accent text-accent-foreground ml-1.5 rounded px-1.5 py-0.5 font-sans text-[10px] tracking-wide uppercase">
            essential
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit item"
        className="text-muted/60 hover:text-ink"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label="Delete item"
        className="text-muted/60 hover:text-danger"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}

function EditRow({
  item,
  groups,
  onSave,
  onCancel,
}: {
  item: PackingItemDTO;
  groups: string[];
  onSave: (patch: {
    category: string;
    label: string;
    quantityHint: string | null;
    essential: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [quantityHint, setQuantityHint] = useState(item.quantityHint ?? '');
  const [group, setGroup] = useState(groups.includes(item.category) ? item.category : NEW_GROUP);
  const [newGroup, setNewGroup] = useState(groups.includes(item.category) ? '' : item.category);
  const [essential, setEssential] = useState(item.essential ?? false);

  function submit() {
    const category = (group === NEW_GROUP ? newGroup : group).trim();
    const trimmedLabel = label.trim();
    if (!trimmedLabel || !category) return;
    onSave({ category, label: trimmedLabel, quantityHint: quantityHint.trim() || null, essential });
  }

  return (
    <div className="bg-canvas/50 grid gap-2 rounded-md p-3 sm:grid-cols-[1fr_1fr_auto]">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Item"
        aria-label="Item"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <Input
        value={quantityHint}
        onChange={(e) => setQuantityHint(e.target.value)}
        placeholder="Quantity hint"
        aria-label="Quantity hint"
      />
      <div className="flex items-center gap-2">
        <Select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          aria-label="Group"
          className="h-10"
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
          <option value={NEW_GROUP}>+ New group…</option>
        </Select>
        <button
          type="button"
          onClick={submit}
          aria-label="Save"
          className="text-success hover:opacity-80"
        >
          <Check className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="text-muted hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {group === NEW_GROUP && (
        <Input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="New group name"
          aria-label="New group name"
          className="sm:col-span-3"
        />
      )}
      <label className="text-ink flex items-center gap-2 text-sm sm:col-span-3">
        <input
          type="checkbox"
          checked={essential}
          onChange={(e) => setEssential(e.target.checked)}
          className="size-4 accent-[var(--vos-color-primary)]"
        />
        Essential
      </label>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="rounded-pill bg-canvas h-2 w-full overflow-hidden">
      <div
        className="rounded-pill bg-success h-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function AddPackingModal({ groups, onClose }: { groups: string[]; onClose: () => void }) {
  const [state, action, pending] = useActionState<AddPackingState, FormData>(
    addPackingItem,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);
  const [group, setGroup] = useState(groups[0] ?? NEW_GROUP);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  const usingNew = group === NEW_GROUP || groups.length === 0;

  return (
    <Modal title="Add item" eyebrow="New item" onClose={onClose}>
      <form ref={ref} action={action} className="space-y-3 p-5">
        <div>
          <Label htmlFor="pack-label">Item</Label>
          <Input id="pack-label" name="label" required autoFocus placeholder="Water shoes" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pack-group">Group</Label>
            {groups.length > 0 ? (
              <Select
                id="pack-group"
                name={usingNew ? undefined : 'category'}
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="h-10 w-full"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value={NEW_GROUP}>+ New group…</option>
              </Select>
            ) : (
              <Input id="pack-group" name="category" required placeholder="Outdoor & hiking" />
            )}
          </div>
          <div>
            <Label htmlFor="pack-qty">Quantity hint</Label>
            <Input id="pack-qty" name="quantityHint" placeholder="2 pairs" />
          </div>
        </div>
        {groups.length > 0 && usingNew && (
          <Input name="category" required placeholder="New group name" />
        )}
        <label className="text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="essential"
            className="size-4 accent-[var(--vos-color-primary)]"
          />
          Mark as essential
        </label>
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" aria-hidden /> {pending ? 'Adding…' : 'Add item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
