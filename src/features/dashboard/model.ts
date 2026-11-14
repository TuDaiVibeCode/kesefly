import type { Category, Transaction } from '@/types/transaction';
import { formatCalendarDate, parseDateOnly } from '@/shared/dates';

export function calendarKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  return calendarKey(new Date(year, number - 1 + delta, 1)).slice(0, 7);
}
export function monthLabel(month: string) {
  const [year, number] = month.split('-').map(Number);
  return `Tháng ${number}, ${year}`;
}
export function shortDate(date: string) {
  return formatCalendarDate(date);
}
export function dashboardModel(transactions: readonly Transaction[], month: string, now: Date) {
  const [year, number] = month.split('-').map(Number);
  const currentMonth = calendarKey(now).slice(0, 7);
  const previousMonth = shiftMonth(month, -1);
  const previousDays = new Date(year, number - 1, 0).getDate();
  const days = new Date(year, number, 0).getDate();
  const ongoing = month === currentMonth;
  const future = month > currentMonth;
  const endDay = ongoing ? Math.min(now.getDate(), previousDays) : days;
  const previousEndDay = ongoing ? endDay : previousDays;
  const dateAt = (m: string, d: number) => `${m}-${String(d).padStart(2, '0')}`;
  const comparisonEnd = dateAt(month, endDay);
  const previousEnd = dateAt(previousMonth, previousEndDay);
  const confirmed = transactions.filter((row) => row.status === 'confirmed' && row.deletedAt == null && parseDateOnly(row.date) !== null);
  const dayOf = (row: Transaction) => calendarKey(parseDateOnly(row.date)!);
  const rows = confirmed.filter((row) => dayOf(row).slice(0, 7) === month && (!ongoing || dayOf(row) <= calendarKey(now)));
  const expenseRows = rows.filter((row) => row.type === 'EXPENSE');
  const sum = (list: readonly Transaction[]) => list.reduce((total, row) => total + row.amount, 0);
  const spending = sum(expenseRows);
  const income = sum(rows.filter((row) => row.type === 'INCOME'));
  const priorRows = confirmed.filter((row) => dayOf(row) >= dateAt(previousMonth, 1) && dayOf(row) <= previousEnd);
  const previousSpending = sum(priorRows.filter((row) => row.type === 'EXPENSE'));
  const comparableSpending = sum(expenseRows.filter((row) => dayOf(row) <= comparisonEnd));
  const difference = comparableSpending - previousSpending;
  const categories = new Map<Category, number>();
  for (const row of expenseRows) categories.set(row.category, (categories.get(row.category) ?? 0) + row.amount);
  let breakdown = [...categories].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  if (breakdown.length > 5) {
    const main = breakdown.filter((row) => row.category !== 'Other').slice(0, 4);
    const visible = new Set(main.map((row) => row.category));
    breakdown = [...main, { category: 'Other', amount: breakdown.filter((row) => !visible.has(row.category)).reduce((total, row) => total + row.amount, 0) }];
  }
  return { spending, income, rows, breakdown, ongoing, future,
    recent: [...rows].sort((a, b) => parseDateOnly(b.date)!.getTime() - parseDateOnly(a.date)!.getTime() || a.id.localeCompare(b.id)).slice(0, 5),
    range: `${dateAt(month, 1)} / ${ongoing ? calendarKey(now) : dateAt(month, days)}`,
    comparison: { available: !future && priorRows.length > 0 && rows.length > 0, previousSpending, comparableSpending, difference,
      percent: previousSpending > 0 ? difference / previousSpending * 100 : null,
      currentStart: dateAt(month, 1), currentEnd: comparisonEnd, previousStart: dateAt(previousMonth, 1), previousEnd },
  };
}
