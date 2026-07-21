import { describe, it, expect } from "vitest";
import { findDuplicateDocument } from "../../src/utils/duplicateDetection";
import { DocumentRecord } from "../../src/types";

function makeDoc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "doc-1",
    userId: "test-user",
    fileName: "receipt.png",
    uploadedAt: Date.now(),
    data: {
      storeName: "Trader Joe's",
      date: "2026-07-01",
      subtotal: 40,
      tax: 4,
      total: 44,
      category: "Groceries",
      items: [],
    },
    ...overrides,
  };
}

describe("findDuplicateDocument", () => {
  it("flags an exact vendor + date + total match", () => {
    const existing = [makeDoc()];
    const result = findDuplicateDocument(existing, {
      storeName: "Trader Joe's",
      date: "2026-07-01",
      total: 44,
    });

    expect(result?.id).toBe("doc-1");
  });

  it("is case-insensitive and whitespace-tolerant on vendor name", () => {
    const existing = [makeDoc()];
    const result = findDuplicateDocument(existing, {
      storeName: "  TRADER JOE'S  ",
      date: "2026-07-01",
      total: 44,
    });

    expect(result?.id).toBe("doc-1");
  });

  it("tolerates tiny floating point drift in the total", () => {
    const existing = [makeDoc({ data: { ...makeDoc().data, total: 44.0000001 } })];
    const result = findDuplicateDocument(existing, {
      storeName: "Trader Joe's",
      date: "2026-07-01",
      total: 44,
    });

    expect(result).not.toBeNull();
  });

  it("does not flag when the vendor differs", () => {
    const existing = [makeDoc()];
    const result = findDuplicateDocument(existing, {
      storeName: "Costco",
      date: "2026-07-01",
      total: 44,
    });

    expect(result).toBeNull();
  });

  it("does not flag when the date differs", () => {
    const existing = [makeDoc()];
    const result = findDuplicateDocument(existing, {
      storeName: "Trader Joe's",
      date: "2026-07-02",
      total: 44,
    });

    expect(result).toBeNull();
  });

  it("does not flag when the total differs beyond the float tolerance", () => {
    const existing = [makeDoc()];
    const result = findDuplicateDocument(existing, {
      storeName: "Trader Joe's",
      date: "2026-07-01",
      total: 44.5,
    });

    expect(result).toBeNull();
  });

  it("returns null when candidate fields are missing", () => {
    const existing = [makeDoc()];

    expect(findDuplicateDocument(existing, { storeName: null, date: "2026-07-01", total: 44 })).toBeNull();
    expect(findDuplicateDocument(existing, { storeName: "Trader Joe's", date: null, total: 44 })).toBeNull();
    expect(findDuplicateDocument(existing, { storeName: "Trader Joe's", date: "2026-07-01", total: null })).toBeNull();
  });

  it("returns null when there are no existing documents", () => {
    const result = findDuplicateDocument([], {
      storeName: "Trader Joe's",
      date: "2026-07-01",
      total: 44,
    });

    expect(result).toBeNull();
  });

  it("excludes a document by id, e.g. when re-checking itself after an edit", () => {
    const existing = [makeDoc({ id: "doc-1" })];
    const result = findDuplicateDocument(
      existing,
      { storeName: "Trader Joe's", date: "2026-07-01", total: 44 },
      "doc-1"
    );

    expect(result).toBeNull();
  });

  it("returns the first match when multiple documents match", () => {
    const existing = [makeDoc({ id: "doc-1" }), makeDoc({ id: "doc-2" })];
    const result = findDuplicateDocument(existing, {
      storeName: "Trader Joe's",
      date: "2026-07-01",
      total: 44,
    });

    expect(result?.id).toBe("doc-1");
  });
});
