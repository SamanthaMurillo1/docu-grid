import { startOfWeek, startOfMonth, format, parseISO, isValid } from "date-fns";
import { DocumentRecord, IncomeRecord } from "../types";

export type Granularity = "daily" | "weekly" | "monthly";

export interface PeriodSummary {
  periodKey: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

function resolveExpenseDate(doc: DocumentRecord): Date {
  const raw = doc.data.date;
  if (raw) {
    const parsed = parseISO(raw);
    if (isValid(parsed)) return parsed;
  }
  return new Date(doc.uploadedAt);
}

function resolveIncomeDate(record: IncomeRecord): Date {
  const parsed = parseISO(record.date);
  return isValid(parsed) ? parsed : new Date(record.createdAt);
}

function bucketDate(date: Date, granularity: Granularity): { key: string; label: string } {
  if (granularity === "daily") {
    return { key: format(date, "yyyy-MM-dd"), label: format(date, "MMM d") };
  }
  if (granularity === "weekly") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return { key: format(start, "yyyy-MM-dd"), label: `Week of ${format(start, "MMM d")}` };
  }
  const start = startOfMonth(date);
  return { key: format(start, "yyyy-MM"), label: format(start, "MMM yyyy") };
}

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
