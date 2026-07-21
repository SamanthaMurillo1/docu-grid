import { describe, it, expect } from "vitest";
import { filterDocuments } from "../../src/utils/filterDocuments";
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
  } as DocumentRecord;
}

describe("filterDocuments", () => {
  it("returns all documents when no filters are set", () => {
    const docs = [makeDoc({ id: "1" }), makeDoc({ id: "2" })];
    const result = filterDocuments(docs, {});
    expect(result).toHaveLength(2);
  });

  it("matches search term against the file name", () => {
    const docs = [
      makeDoc({ id: "1", fileName: "costco-receipt.png" }),
      makeDoc({ id: "2", fileName: "target-receipt.png" }),
    ];
    const result = filterDocuments(docs, { searchTerm: "costco" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("matches search term against the vendor name, case-insensitively", () => {
    const docs = [
      makeDoc({ id: "1", data: { ...makeDoc().data, storeName: "Whole Foods" } }),
      makeDoc({ id: "2", data: { ...makeDoc().data, storeName: "Trader Joe's" } }),
    ];
    const result = filterDocuments(docs, { searchTerm: "WHOLE" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by exact category", () => {
    const docs = [
      makeDoc({ id: "1", data: { ...makeDoc().data, category: "Groceries" } }),
      makeDoc({ id: "2", data: { ...makeDoc().data, category: "Entertainment" } }),
    ];
    const result = filterDocuments(docs, { category: "Entertainment" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by minimum total (inclusive)", () => {
    const docs = [
      makeDoc({ id: "1", data: { ...makeDoc().data, total: 10 } }),
      makeDoc({ id: "2", data: { ...makeDoc().data, total: 50 } }),
    ];
    const result = filterDocuments(docs, { minTotal: "50" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by maximum total (inclusive)", () => {
    const docs = [
      makeDoc({ id: "1", data: { ...makeDoc().data, total: 10 } }),
      makeDoc({ id: "2", data: { ...makeDoc().data, total: 50 } }),
    ];
    const result = filterDocuments(docs, { maxTotal: "10" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("combines search, category, and total range with AND logic", () => {
    const docs = [
      makeDoc({
        id: "1",
        fileName: "costco-receipt.png",
        data: { ...makeDoc().data, category: "Groceries", total: 30 },
      }),
      makeDoc({
        id: "2",
        fileName: "costco-receipt-2.png",
        data: { ...makeDoc().data, category: "Electronics", total: 30 },
      }),
      makeDoc({
        id: "3",
        fileName: "costco-receipt-3.png",
        data: { ...makeDoc().data, category: "Groceries", total: 999 },
      }),
    ];

    const result = filterDocuments(docs, {
      searchTerm: "costco",
      category: "Groceries",
      minTotal: "20",
      maxTotal: "40",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns an empty array when no documents match", () => {
    const docs = [makeDoc()];
    const result = filterDocuments(docs, { searchTerm: "nonexistent-vendor" });
    expect(result).toEqual([]);
  });

  it("treats an empty string category as no filter", () => {
    const docs = [makeDoc({ id: "1" }), makeDoc({ id: "2", data: { ...makeDoc().data, category: "Other" } })];
    const result = filterDocuments(docs, { category: "" });
    expect(result).toHaveLength(2);
  });

  it("treats empty min/max total strings as no constraint", () => {
    const docs = [makeDoc({ id: "1", data: { ...makeDoc().data, total: 0 } })];
    const result = filterDocuments(docs, { minTotal: "", maxTotal: "" });
    expect(result).toHaveLength(1);
  });

  it("treats a document with a missing total as 0 for range filtering", () => {
    const docs = [makeDoc({ id: "1", data: { ...makeDoc().data, total: null } })];
    const result = filterDocuments(docs, { minTotal: "0", maxTotal: "0" });
    expect(result).toHaveLength(1);
  });

  it("returns an empty array when given no documents", () => {
    expect(filterDocuments([], { searchTerm: "anything" })).toEqual([]);
  });
});
