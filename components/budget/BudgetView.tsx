'use client';

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
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
          <p className="eyebrow mb-1 text-muted">The money map</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Budget</h1>
        </div>
        <Button variant={showAdd ? 'secondary' : 'primary'} onClick={() => setShowAdd((v) => !v)}>
          <Plus className="size-4" aria-hidden /> Add expense
        </Button>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">Spent</p>
            <p className="font-display text-3xl font-semibold text-ink">{formatMoney(total, currency)}</p>
          </div>
          {budget != null && (
            <div className="text-right">
              <p className="eyebrow text-muted">{over ? 'Over budget' : 'Remaining'}</p>
              <p className={`font-mono text-lg ${over ? 'text-danger' : 'text-ink'}`}>
                {formatMoney(Math.abs(budget - total), currency)}
              </p>
            </div>
          )}
        </div>

        {budget != null && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-pill bg-canvas">
            <div
              className={`h-full rounded-pill transition-all ${over ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <BudgetForm budget={budget} currency={currency} />
      </div>

      {/* Breakdown */}
      {byCategory.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
          <p className="eyebrow mb-3 text-muted">By category</p>
          <div className="space-y-2.5">
            {byCategory.map(([cat, amount]) => {
              const def = getExpenseCategory(cat);
              const share = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="flex w-28 shrink-0 items-center gap-1.5 text-sm text-ink">
                    <def.icon className="size-3.5 text-muted" aria-hidden /> {def.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-pill bg-canvas">
                    <span
                      className="block h-full rounded-pill"
                      style={{ width: `${share}%`, backgroundColor: def.color }}
                    />
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono text-xs text-muted">
                    {formatMoney(amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && <ExpenseForm currency={currency} onDone={() => setShowAdd(false)} />}

      {/* List */}
      {optimistic.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center text-muted">
          No expenses yet — log your first one.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {optimistic.map((e) => {
            const def = getExpenseCategory(e.category);
            return (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `color-mix(in srgb, ${def.color} 16%, transparent)`, color: def.color }}
                >
                  <def.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{e.label}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {def.label} · {e.date}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm text-ink">{formatMoney(e.amount, currency)}</span>
                <button
                  type="button"
                  onClick={() => onDelete(e.id)}
                  aria-label="Delete expense"
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

function BudgetForm({ budget, currency }: { budget?: number; currency: string }) {
  const [state, action, pending] = useActionState<SetBudgetState, FormData>(setTripBudget, undefined);

  return (
    <form action={action} className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4">
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
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}

function ExpenseForm({ currency, onDone }: { currency: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<AddExpenseState, FormData>(addExpense, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onDone();
    }
  }, [state, onDone]);

  return (
    <form ref={ref} action={action} className="grid gap-3 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="label">What for</Label>
        <Input id="label" name="label" required placeholder="Dinner at …" />
      </div>
      <div>
        <Label htmlFor="amount">Amount ({currency})</Label>
        <Input id="amount" name="amount" type="number" step="any" min="0" required placeholder="0.00" />
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
      <div>
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" required defaultValue={todayKey()} />
      </div>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
