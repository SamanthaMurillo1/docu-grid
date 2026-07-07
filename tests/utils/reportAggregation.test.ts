import { describe, it, expect } from "vitest";
import { aggregateByPeriod } from "../../src/utils/reportAggregation";
import { DocumentRecord, IncomeRecord } from "../../src/types";

function makeDoc(date: string, total: number): DocumentRecord {
  return {
    id: `doc-${date}-${total}`,
    userId: "test-user",
    fileName: "receipt.png",
    uploadedAt: new Date(date).getTime(),
    data: {
      storeName: "Test Store",
      date,
      subtotal: total,
      tax: 0,
      total,
      category: "Groceries",
      items: [],
    },
  };
}

function makeIncome(date: string, amount: number): IncomeRecord {
  return {
    id: `income-${date}-${amount}`,
    userId: "test-user",
    source: "Test Job",
    category: "Salary",
    amount,
    date,
    createdAt: new Date(date).getTime(),
  };
}

describe("aggregateByPeriod", () => {
  it("groups same-day expenses into a single daily bucket", () => {
    const docs = [makeDoc("2026-07-01", 20), makeDoc("2026-07-01", 30)];
    const result = aggregateByPeriod(docs, [], "daily");

    expect(result).toHaveLength(1);
    expect(result[0].expense).toBe(50);
  });

  it("groups same-week expenses into a single weekly bucket", () => {
    const docs = [makeDoc("2026-07-06", 50), makeDoc("2026-07-08", 30)];
    const result = aggregateByPeriod(docs, [], "weekly");

    expect(result).toHaveLength(1);
    expect(result[0].expense).toBe(80);
  });

  it("keeps different months in separate monthly buckets", () => {
    const docs = [makeDoc("2026-06-28", 20), makeDoc("2026-07-02", 30)];
    const result = aggregateByPeriod(docs, [], "monthly");

    expect(result).toHaveLength(2);
  });

  it("combines income and expense in the same period correctly", () => {
    const docs = [makeDoc("2026-07-01", 40)];
    const income = [makeIncome("2026-07-01", 100)];
    const result = aggregateByPeriod(docs, income, "daily");

    expect(result).toHaveLength(1);
    expect(result[0].income).toBe(100);
    expect(result[0].expense).toBe(40);
    expect(result[0].net).toBe(60);
  });

  it("falls back to uploadedAt when a document's date field is invalid", () => {
    const doc = makeDoc("2026-07-01", 25);
    doc.data.date = "not-a-real-date"; // invalid date field, but uploadedAt stays valid
    const result = aggregateByPeriod([doc], [], "daily");

    expect(result).toHaveLength(1);
    expect(result[0].expense).toBe(25);
  });

  it("returns an empty array when given no data", () => {
    expect(aggregateByPeriod([], [], "daily")).toEqual([]);
  });

  it("sorts periods chronologically", () => {
    const docs = [makeDoc("2026-07-05", 10), makeDoc("2026-07-01", 10), makeDoc("2026-07-03", 10)];
    const result = aggregateByPeriod(docs, [], "daily");

    const keys = result.map(r => r.periodKey);
    expect(keys).toEqual([...keys].sort());
  });
  it("handles decimal amounts without floating point drift issues", () => {
    const docs = [makeDoc("2026-07-01", 10.1), makeDoc("2026-07-01", 20.2)];
    const result = aggregateByPeriod(docs, [], "daily");

    expect(result[0].expense).toBeCloseTo(30.3, 2);
  });

  it("treats a net of exactly zero as non-negative (income equals expense)", () => {
    const docs = [makeDoc("2026-07-01", 50)];
    const income = [makeIncome("2026-07-01", 50)];
    const result = aggregateByPeriod(docs, income, "daily");

    expect(result[0].net).toBe(0);
  });

  it("produces a negative net when expenses exceed income in a period", () => {
    const docs = [makeDoc("2026-07-01", 100)];
    const income = [makeIncome("2026-07-01", 30)];
    const result = aggregateByPeriod(docs, income, "daily");

    expect(result[0].net).toBe(-70);
  });

  it("does not let documents and income leak into each other's totals", () => {
    const docs = [makeDoc("2026-07-01", 25)];
    const income = [makeIncome("2026-07-01", 60)];
    const result = aggregateByPeriod(docs, income, "daily");

    expect(result[0].expense).toBe(25);
    expect(result[0].income).toBe(60);
  });

  it("correctly labels weekly buckets with the week's start date", () => {
    const docs = [makeDoc("2026-07-08", 10)]; // a Wednesday
    const result = aggregateByPeriod(docs, [], "weekly");

    expect(result[0].label).toMatch(/^Week of Jul 6/); // Monday of that week
  });

  it("correctly labels monthly buckets by month name and year", () => {
    const docs = [makeDoc("2026-07-15", 10)];
    const result = aggregateByPeriod(docs, [], "monthly");

    expect(result[0].label).toBe("Jul 2026");
  });

  
});