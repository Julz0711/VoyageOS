'use client';

import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, SlidersHorizontal } from 'lucide-react';
import type { ExpenseDTO, TripDTO } from '@/lib/dto';
import {
  addExpense,
  updateExpense,
  deleteExpense,
  setTripBudget,
  type AddExpenseState,
  type SetBudgetState,
} from '@/lib/budget/actions';
import {
  expenseCategories,
  expenseCategoryIds,
  getExpenseCategory,
  expensePhases,
  expensePhaseIds,
  getExpensePhase,
  phaseForDate,
  type ExpensePhase,
  currencies,
  DEFAULT_CURRENCY,
  formatMoney,
} from '@/config/expenses';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ModalFooter } from '@/components/ui/modal-footer';
import { cn } from '@/lib/utils';

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
  const [showBudgets, setShowBudgets] = useState(false);
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<ExpensePhase | 'all'>('all');

  // Effective phase for an expense — stored value, or derived from its date (legacy rows).
  const phaseOf = useMemo(() => {
    return (e: ExpenseDTO): ExpensePhase =>
      (e.phase as ExpensePhase) || phaseForDate(e.date, trip.dateStart, trip.dateEnd);
  }, [trip.dateStart, trip.dateEnd]);

  const total = useMemo(() => optimistic.reduce((s, e) => s + e.amount, 0), [optimistic]);

  const spentByPhase = useMemo(() => {
    const map: Record<ExpensePhase, number> = { pre: 0, during: 0, post: 0 };
    for (const e of optimistic) map[phaseOf(e)] += e.amount;
    return map;
  }, [optimistic, phaseOf]);

  const filtered = useMemo(
    () => (phaseFilter === 'all' ? optimistic : optimistic.filter((e) => phaseOf(e) === phaseFilter)),
    [optimistic, phaseFilter, phaseOf],
  );

  const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Overall budget is auto-calculated as the sum of the per-phase budgets (falls back to a
  // legacy explicit trip budget for trips set before per-phase budgets existed).
  const pb = trip.phaseBudgets;
  const phaseBudgetSum = (pb?.pre ?? 0) + (pb?.during ?? 0) + (pb?.post ?? 0);
  const overallBudget = phaseBudgetSum > 0 ? phaseBudgetSum : trip.budget;
  const pct = overallBudget && overallBudget > 0 ? Math.min(100, (total / overallBudget) * 100) : 0;
  const over = overallBudget != null && total > overallBudget;

  function onDelete(id: string) {
    startTransition(() => {
      removeOptimistic(id);
      void deleteExpense(id);
    });
  }

  function togglePhase(p: ExpensePhase) {
    setPhaseFilter((cur) => (cur === p ? 'all' : p));
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted mb-1">The money map</p>
          <h1 className="font-display text-ink text-3xl font-semibold">Budget</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowBudgets(true)}>
            <SlidersHorizontal className="size-4" aria-hidden /> Budgets
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="size-4" aria-hidden /> Add expense
          </Button>
        </div>
      </div>

      {/* Hero summary */}
      <div className="border-border bg-surface shadow-card rounded-lg border p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">Spent</p>
            <p className="num text-ink text-3xl font-semibold">{formatMoney(total, currency)}</p>
          </div>
          {overallBudget != null && (
            <div className="text-right">
              <p className="eyebrow text-muted">{over ? 'Over budget' : 'Remaining'}</p>
              <p className={`num text-lg ${over ? 'text-danger' : 'text-ink'}`}>
                {formatMoney(Math.abs(overallBudget - total), currency)}
              </p>
            </div>
          )}
        </div>

        {overallBudget != null && (
          <>
            <div className="rounded-pill bg-canvas mt-4 h-2 w-full overflow-hidden">
              <div
                className={`rounded-pill h-full transition-all ${over ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-muted mt-2 font-sans text-xs">
              <span className="num">{Math.round(pct)}%</span> of{' '}
              <span className="num">{formatMoney(overallBudget, currency)}</span>
              {phaseBudgetSum > 0 ? ' · sum of phase budgets' : ''}
            </p>
          </>
        )}
      </div>

      {/* Phase timeline + per-phase budgets */}
      {total > 0 && (
        <div className="border-border bg-surface shadow-card rounded-lg border p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="eyebrow text-muted">When you spend</p>
            {phaseFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setPhaseFilter('all')}
                className="text-muted hover:text-ink font-sans text-[11px] underline-offset-2 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Segmented timeline bar */}
          <div className="rounded-pill bg-canvas flex h-3 w-full overflow-hidden">
            {expensePhaseIds.map((id) => {
              const amount = spentByPhase[id];
              if (amount <= 0) return null;
              return (
                <div
                  key={id}
                  className="h-full transition-all"
                  style={{ width: `${(amount / total) * 100}%`, backgroundColor: getExpensePhase(id).color }}
                  title={`${getExpensePhase(id).label}: ${formatMoney(amount, currency)}`}
                />
              );
            })}
          </div>

          {/* Per-phase cards (also act as filters) */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {expensePhaseIds.map((id) => (
              <PhaseCard
                key={id}
                phase={id}
                spent={spentByPhase[id]}
                budget={pb?.[id]}
                currency={currency}
                active={phaseFilter === id}
                dimmed={phaseFilter !== 'all' && phaseFilter !== id}
                onClick={() => togglePhase(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Breakdown (respects the active phase filter) */}
      {byCategory.length > 0 && (
        <div className="border-border bg-surface shadow-card rounded-lg border p-6">
          <p className="eyebrow text-muted mb-3 flex items-center gap-2">
            By category
            {phaseFilter !== 'all' && (
              <span
                className="rounded-pill px-2 py-0.5 font-sans text-[10px] tracking-normal normal-case"
                style={{
                  backgroundColor: `color-mix(in srgb, ${getExpensePhase(phaseFilter).color} 16%, transparent)`,
                  color: getExpensePhase(phaseFilter).color,
                }}
              >
                {getExpensePhase(phaseFilter).short}
              </span>
            )}
          </p>
          <div className="space-y-2.5">
            {byCategory.map(([cat, amount]) => {
              const def = getExpenseCategory(cat);
              const share = filteredTotal > 0 ? Math.round((amount / filteredTotal) * 100) : 0;
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
                  <span className="num text-muted w-24 shrink-0 text-right text-xs">
                    {formatMoney(amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && (
        <ExpenseModal
          currency={currency}
          tripStart={trip.dateStart}
          tripEnd={trip.dateEnd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <ExpenseModal
          expense={editing}
          currency={currency}
          tripStart={trip.dateStart}
          tripEnd={trip.dateEnd}
          onDelete={() => {
            onDelete(editing.id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {showBudgets && (
        <BudgetsModal trip={trip} currency={currency} onClose={() => setShowBudgets(false)} />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <p className="border-border bg-surface/50 text-muted rounded-lg border border-dashed p-10 text-center">
          {phaseFilter === 'all'
            ? 'No expenses yet — log your first one.'
            : `No ${getExpensePhase(phaseFilter).short.toLowerCase()}-trip expenses yet.`}
        </p>
      ) : (
        <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
          {filtered.map((e) => {
            const def = getExpenseCategory(e.category);
            const phase = getExpensePhase(phaseOf(e));
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setEditing(e)}
                  className="hover:bg-canvas/50 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors"
                >
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
                    <span className="text-muted flex items-center gap-1.5 font-sans text-[11px]">
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: phase.color }}
                        aria-hidden
                      />
                      {def.label} · <span className="num">{fmtDate(e.date)}</span>
                    </span>
                  </span>
                  <span className="num text-ink shrink-0 text-sm">
                    {formatMoney(e.amount, currency)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fmtDate(date: string): string {
  try {
    return format(parseISO(date), 'd MMM');
  } catch {
    return date;
  }
}

function PhaseCard({
  phase,
  spent,
  budget,
  currency,
  active,
  dimmed,
  onClick,
}: {
  phase: ExpensePhase;
  spent: number;
  budget?: number;
  currency: string;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const def = getExpensePhase(phase);
  const pct = budget && budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget != null && spent > budget;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ '--c': def.color } as React.CSSProperties}
      className={cn(
        'rounded-lg border p-3 text-left transition-all duration-200',
        'hover:border-[color-mix(in_srgb,var(--c)_45%,var(--vos-color-border))]',
        active
          ? 'border-[var(--c)] bg-[color-mix(in_srgb,var(--c)_8%,var(--vos-color-surface))] ring-1 ring-[color-mix(in_srgb,var(--c)_45%,transparent)]'
          : 'border-border bg-canvas/40',
        dimmed && 'opacity-55',
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: def.color }} aria-hidden />
        <span className="text-ink text-sm font-semibold">{def.short}</span>
      </span>
      <span className="num text-ink mt-1.5 block text-lg">{formatMoney(spent, currency)}</span>
      {budget != null ? (
        <>
          <span className="rounded-pill bg-ink/[0.06] mt-1.5 block h-1.5 w-full overflow-hidden">
            <span
              className="rounded-pill block h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: over ? 'var(--vos-color-danger)' : def.color }}
            />
          </span>
          <span className={cn('mt-1 block font-sans text-[11px]', over ? 'text-danger' : 'text-muted')}>
            <span className="num">{Math.round(pct)}%</span> of{' '}
            <span className="num">{formatMoney(budget, currency)}</span>
          </span>
        </>
      ) : (
        <span className="text-muted/60 mt-1 block font-sans text-[11px]">No budget set</span>
      )}
    </button>
  );
}

function ExpenseModal({
  expense,
  currency,
  tripStart,
  tripEnd,
  onDelete,
  onClose,
}: {
  expense?: ExpenseDTO;
  currency: string;
  tripStart: string;
  tripEnd: string;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEdit = expense != null;
  const [state, action, pending] = useActionState<AddExpenseState, FormData>(
    isEdit ? updateExpense : addExpense,
    undefined,
  );
  const ref = useRef<HTMLFormElement>(null);

  const initialDate = expense ? expense.date.slice(0, 10) : todayKey();
  const [date, setDate] = useState(initialDate);
  const [phase, setPhase] = useState<ExpensePhase>(
    () => (expense?.phase as ExpensePhase) || phaseForDate(initialDate, tripStart, tripEnd),
  );
  // For edits, keep the stored phase unless the user changes it explicitly.
  const [phaseTouched, setPhaseTouched] = useState(isEdit);

  // Until the user picks a phase manually, keep it in sync with the chosen date.
  function onDateChange(value: string) {
    setDate(value);
    if (!phaseTouched && value) setPhase(phaseForDate(value, tripStart, tripEnd));
  }

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      onClose();
    }
  }, [state, onClose]);

  return (
    <Modal
      title={isEdit ? 'Edit expense' : 'Add expense'}
      eyebrow={isEdit ? 'Update entry' : 'New entry'}
      onClose={onClose}
    >
      <form ref={ref} action={action} className="space-y-3 p-5">
        {isEdit && <input type="hidden" name="id" value={expense.id} />}
        <div>
          <Label htmlFor="label">What for</Label>
          <Input
            id="label"
            name="label"
            required
            autoFocus
            defaultValue={expense?.label}
            placeholder="Dinner at …"
          />
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
              defaultValue={expense?.amount}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              name="category"
              defaultValue={expense?.category ?? 'food'}
              className="w-full"
            >
              {expenseCategoryIds.map((id) => (
                <option key={id} value={id}>
                  {expenseCategories[id].label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="phase">Phase</Label>
            <Select
              id="phase"
              name="phase"
              className="w-full"
              value={phase}
              onChange={(e) => {
                setPhase(e.target.value as ExpensePhase);
                setPhaseTouched(true);
              }}
            >
              {expensePhaseIds.map((id) => (
                <option key={id} value={id}>
                  {expensePhases[id].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-muted/70 font-sans text-[11px]">{getExpensePhase(phase).hint}.</p>
        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <ModalFooter
          onDelete={isEdit ? onDelete : undefined}
          onCancel={onClose}
          confirmText="Delete this expense?"
        >
          <Button type="submit" disabled={pending}>
            {isEdit ? (
              pending ? (
                'Saving…'
              ) : (
                'Save changes'
              )
            ) : (
              <>
                <Plus className="size-4" aria-hidden /> {pending ? 'Adding…' : 'Add expense'}
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function BudgetsModal({
  trip,
  currency,
  onClose,
}: {
  trip: TripDTO;
  currency: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<SetBudgetState, FormData>(setTripBudget, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const pb = trip.phaseBudgets;
  // Live total of the inputs, so the auto-calculated overall is visible as you type.
  const [amounts, setAmounts] = useState<Record<ExpensePhase, string>>({
    pre: pb?.pre != null ? String(pb.pre) : '',
    during: pb?.during != null ? String(pb.during) : '',
    post: pb?.post != null ? String(pb.post) : '',
  });
  const overall = expensePhaseIds.reduce((s, id) => s + (parseFloat(amounts[id]) || 0), 0);

  return (
    <Modal title="Budgets" eyebrow="Plan your spend" onClose={onClose}>
      <form action={action} className="space-y-4 p-5">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" name="currency" defaultValue={currency} className="w-full">
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="border-border border-t pt-4">
          <p className="eyebrow text-muted mb-1">Per phase (optional)</p>
          <p className="text-muted/70 mb-3 font-sans text-[11px]">
            Budget each phase separately to track planning, on-trip, and after-trip spend. The
            overall budget is their sum.
          </p>
          <div className="space-y-3">
            {expensePhaseIds.map((id) => (
              <div key={id} className="flex items-center gap-3">
                <span className="flex w-28 shrink-0 items-center gap-1.5 text-sm">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: expensePhases[id].color }}
                    aria-hidden
                  />
                  {expensePhases[id].label}
                </span>
                <Input
                  name={`budget${id.charAt(0).toUpperCase()}${id.slice(1)}`}
                  type="number"
                  step="any"
                  min="0"
                  value={amounts[id]}
                  onChange={(e) => setAmounts((a) => ({ ...a, [id]: e.target.value }))}
                  placeholder="—"
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-border flex items-center justify-between border-t pt-4">
          <span className="eyebrow text-muted">Overall budget</span>
          <span className="num text-ink text-lg font-semibold">
            {overall > 0 ? formatMoney(overall, currency) : '—'}
          </span>
        </div>

        {state?.error && <p className="text-danger text-sm">{state.error}</p>}
        <div className="border-border flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save budgets'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
