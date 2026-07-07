import { describe, it, expect } from "vitest";
import { buildExportRows } from "../../src/utils/buildExportRows";
import { ExtractedData, MappedField } from "../../src/types";

function makeExtractedData(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    storeName: "Test Store",
    date: "2026-07-01",
    subtotal: 40,
    tax: 4,
    total: 44,
    category: "Groceries",
    items: [],
    ...overrides,
  };
}

const basicMappings: MappedField[] = [
  { extractedKey: "storeName", excelColumn: "Vendor" },
  { extractedKey: "total", excelColumn: "Total Cost" },
];

describe("buildExportRows", () => {
  it("produces a single row when there are no line items", () => {
    const rows = buildExportRows(makeExtractedData(), basicMappings);
    expect(rows).toHaveLength(1);
    expect(rows[0]["Vendor"]).toBe("Test Store");
    expect(rows[0]["Total Cost"]).toBe(44);
  });

  it("produces one row per line item when items exist", () => {
    const data = makeExtractedData({
      items: [
        { id: "1", name: "Bananas", quantity: 2, price: 0.99 },
        { id: "2", name: "Milk", quantity: 1, price: 3.49 },
      ],
    });
    const rows = buildExportRows(data, basicMappings);

    expect(rows).toHaveLength(2);
    expect(rows[0]["Item Name"]).toBe("Bananas");
    expect(rows[1]["Item Name"]).toBe("Milk");
    // Header fields should repeat on every row
    expect(rows[0]["Vendor"]).toBe("Test Store");
    expect(rows[1]["Vendor"]).toBe("Test Store");
  });

  it("skips fields the user chose not to export (empty excelColumn)", () => {
    const mappings: MappedField[] = [
      { extractedKey: "storeName", excelColumn: "Vendor" },
      { extractedKey: "tax", excelColumn: "" }, // user selected "-- Do not export --"
    ];
    const rows = buildExportRows(makeExtractedData(), mappings);

    expect(rows[0]).toHaveProperty("Vendor");
    expect(rows[0]).not.toHaveProperty("Tax Amount");
  });

  it("includes quantity and price fields for each item row", () => {
    const data = makeExtractedData({
      items: [{ id: "1", name: "Bread", quantity: 3, price: 2.5 }],
    });
    const rows = buildExportRows(data, basicMappings);

    expect(rows[0]["Quantity"]).toBe(3);
    expect(rows[0]["Item Price"]).toBe(2.5);
  });

  it("returns an empty-object row if mappings array is empty and no items exist", () => {
    const rows = buildExportRows(makeExtractedData(), []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({});
  });
});