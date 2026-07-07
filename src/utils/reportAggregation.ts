import { startOfWeek, startOfMonth, format } from "date-fns";
import { DocumentRecord, IncomeRecord } from "../types";

export type Granularity = "daily" | "weekly" | "monthly";

export interface PeriodSummary {
  periodKey: string; // sortable key, e.g. "2026-07-05" | week-start date | "2026-07"
  label: string;      // display label, e.g. "Jul 5" | "Week of Jul 6" | "Jul 2026"
  income: number;
  expense: number;
  net: number;
}

function resolveExpenseDate(doc: DocumentRecord): Date {
  const raw = doc.data.date;
  const parsed = raw ? new Date(raw) : new Date(doc.uploadedAt);
  return isNaN(parsed.getTime()) ? new Date(doc.uploadedAt) : parsed;
}

function resolveIncomeDate(record: IncomeRecord): Date {
  const parsed = new Date(record.date);
  return isNaN(parsed.getTime()) ? new Date(record.createdAt) : parsed;
}

function bucketDate(date: Date, granularity: Granularity): { key: string; label: string } {
  if (granularity === "daily") {
    return { key: format(date, "yyyy-MM-dd"), label: format(date, "MMM d") };
  }
  if (granularity === "weekly") {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday-start weeks
    return { key: format(start, "yyyy-MM-dd"), label: `Week of ${format(start, "MMM d")}` };
  }
  const start = startOfMonth(date);
  return { key: format(start, "yyyy-MM"), label: format(start, "MMM yyyy") };
}

/**
 * Groups expenses (DocumentRecord) and income (IncomeRecord) into period
 * buckets by day, week, or month. Shared by Dashboard charts and any future
 * feature (exports, budget comparisons, recurring-summary emails, etc).
 */
export function aggregateByPeriod(
  documents: DocumentRecord[],
  income: IncomeRecord[],
  granularity: Granularity
): PeriodSummary[] {
  const map = new Map<string, PeriodSummary>();

  documents.forEach(doc => {
    const { key, label } = bucketDate(resolveExpenseDate(doc), granularity);
    const existing = map.get(key) || { periodKey: key, label, income: 0, expense: 0, net: 0 };
    existing.expense += doc.data.total || 0;
    map.set(key, existing);
  });

  income.forEach(record => {
    const { key, label } = bucketDate(resolveIncomeDate(record), granularity);
    const existing = map.get(key) || { periodKey: key, label, income: 0, expense: 0, net: 0 };
    existing.income += record.amount || 0;
    map.set(key, existing);
  });

  return Array.from(map.values())
    .map(p => ({ ...p, net: p.income - p.expense }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}