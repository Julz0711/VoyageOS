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
import { Plus, Trash2, Wallet } from 'lucide-react';
import type { ExpenseDTO, TripDTO } from '@/lib/dto';
import {
  addExpense,
  deleteExpense,
  setTripBudget,
  type AddExpenseState,
  type SetBudgetState,
} from '@/lib/budget/actions';
import {
  expenseCategories,
  expenseCategoryIds,
  getExpenseCategory,
  currencies,
  DEFAULT_CURRENCY,
  formatMoney,
} from '@/config/expenses';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BudgetView({ trip, expenses }: { trip: TripDTO; expenses: ExpenseDTO[] }) {
  const currency = trip.currency ?? DEFAULT_CURRENCY;
  const [optimistic, removeOptimistic] = useOptimistic(expenses, (list: ExpenseDTO[], id: string) =>
    list.filter((e) => e.id !== id),
  );
  const [, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  const total = useMemo(() => optimistic.reduce((s, e) => s + e.amount, 0), [optimistic]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of optimistic) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [optimistic]);

  const budget = trip.budget;
  const pct = budget && budget > 0 ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const over = budget != null && total > budget;

  function onDelete(id: string) {
    startTransition(() => {
      removeOptimistic(id);
      void deleteExpense(id);
    });
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted mb-1">The money map</p>
          <h1 className="font-display text-ink text-3xl font-semibold">Budget</h1>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4" aria-hidden /> Add expense
        </Button>
      </div>

      {/* Summary */}
      <div className="border-border bg-surface shadow-card rounded-lg border p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">Spent</p>
            <p className="font-display text-ink text-3xl font-semibold">
              {formatMoney(total, currency)}
            </p>
          </div>
          {budget != null && (
            <div className="text-right">
              <p className="eyebrow text-muted">{over ? 'Over budget' : 'Remaining'}</p>
              <p className={`font-sans text-lg ${over ? 'text-danger' : 'text-ink'}`}>
                {formatMoney(Math.abs(budget - total), currency)}
              </p>
            </div>
          )}
        </div>

        {budget != null && (
          <div className="rounded-pill bg-canvas mt-4 h-2 w-full overflow-hidden">
            <div
              className={`rounded-pill h-full transition-all ${over ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <BudgetForm budget={budget} currency={currency} />
      </div>

      {/* Breakdown */}
      {byCategory.length > 0 && (
        <div className="border-border bg-surface shadow-card rounded-lg border p-6">
          <p className="eyebrow text-muted mb-3">By category</p>
          <div className="space-y-2.5">
            {byCategory.map(([cat, amount]) => {
              const def = getExpenseCategory(cat);
              const share = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-ink flex w-28 shrink-0 items-center gap-1.5 text-sm">
                    <def.icon className="text-muted size-3.5" aria-hidden /> {def.label}
                  </span>
                  <span className="rounded-pill bg-canvas h-2 flex-1 overflow-hidden">
                    <span
                      className="rounded-pill block h-full"
                      style={{ width: `${share}%`, backgroundColor: def.color }}
                    />
                  </span>
                  <span className="text-muted w-24 shrink-0 text-right font-sans text-xs">
                    {formatMoney(amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && <ExpenseModal currency={currency} onClose={() => setShowAdd(false)} />}

      {/* List */}
      {optimistic.length === 0 ? (
        <p className="border-border bg-surface/50 text-muted rounded-lg border border-dashed p-10 text-center">
          No expenses yet — log your first one.
        </p>
      ) : (
        <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
          {optimistic.map((e) => {
            const def = getExpenseCategory(e.category);
            return (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${def.color} 16%, transparent)`,
                    color: def.color,
                  }}
                >
                  <def.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink block truncate text-sm font-medium">{e.label}</span>
                  <span className="text-muted font-sans text-[11px]">
                    {def.label} · {e.date}
                  </span>
                </span>
                <span className="text-ink shrink-0 font-sans text-sm">
                  {formatMoney(e.amount, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(e.id)}
                  aria-label="Delete expense"
                  className="text-muted/60 hover:text-danger shrink-0 p-1 transition-colors"
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

function BudgetForm({ budget, currency }: { budget?: number; currency: string }) {
  const [state, action, pending] = useActionState<SetBudgetState, FormData>(
    setTripBudget,
    undefined,
  );

  return (
    <form
      action={action}
      className="border-border mt-5 flex flex-wrap items-end gap-3 border-t pt-4"
    >
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" name="currency" defaultValue={currency}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="budget">Budget (optional)</Label>
        <Input
          id="budget"
          name="budget"
          type="number"
          step="any"
          min="0"
          defaultValue={budget ?? ''}
          placeholder="e.g. 1500"
          className="w-36"
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        <Wallet className="size-4" aria-hidden /> {pending ? 'Saving…' : 'Save'}
      </Button>
      {state?.error && <p className="text-danger w-full text-sm">{state.error}</p>}
    </form>
  );
}

function ExpenseModal({ currency, onClose }: { currency: string; onClose: () => void }) {
  const [state, action, pending] = useActionState<AddExpenseState, FormData>(addExpense, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  return (
    <Modal title="Add expense" eyebrow="New entry" onClose={onClose}>
      <form ref={ref} action={action} className="space-y-3 p-5">
        <div>
          <Label htmlFor="label">What for</Label>
          <Input id="label" name="label" required autoFocus placeholder="Dinner at …" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="any"
              min="0"
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required defaultValue={todayKey()} />
          </div>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue="food" className="w-full">
            {expenseCategoryIds.map((id) => (
              <option key={id} value={id}>
                {expenseCategories[id].label}
              </option>
            ))}
          </Select>
        </div>
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" aria-hidden /> {pending ? 'Adding…' : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
