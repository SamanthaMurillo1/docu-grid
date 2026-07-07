import { describe, it, expect, vi } from "vitest";
import { extractDocument } from "../../lib/extractDocument";

function mockGeminiResponse(text: string) {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({ text }),
    },
  } as any;
}

describe("extractDocument", () => {
  it("parses a clean JSON response from Gemini", async () => {
    const mockAi = mockGeminiResponse(
      JSON.stringify({
        storeName: "Trader Joe's",
        date: "2026-07-01",
        subtotal: 42.5,
        tax: 3.4,
        total: 45.9,
        category: "Groceries",
        items: [{ name: "Bananas", quantity: 1, price: 1.99 }],
      })
    );

    const result = await extractDocument(mockAi, {
      base64Data: "fake-base64",
      mimeType: "image/png",
    });

    expect(result.storeName).toBe("Trader Joe's");
    expect(result.category).toBe("Groceries");
    expect(result.items).toHaveLength(1);
  });

  it("strips markdown code fences if Gemini ignores the format instruction", async () => {
    const mockAi = mockGeminiResponse(
      "```json\n" + JSON.stringify({ storeName: "Costco", category: "Groceries", total: 100 }) + "\n```"
    );

    const result = await extractDocument(mockAi, {
      base64Data: "fake-base64",
      mimeType: "image/png",
    });

    expect(result.storeName).toBe("Costco");
  });

  it("falls back to 'Other' when Gemini returns a category outside the fixed list", async () => {
    const mockAi = mockGeminiResponse(
      JSON.stringify({ storeName: "Weird Shop", category: "Not A Real Category", total: 10 })
    );

    const result = await extractDocument(mockAi, {
      base64Data: "fake-base64",
      mimeType: "image/png",
    });

    expect(result.category).toBe("Other");
  });

  it("falls back to 'Other' when category is missing entirely", async () => {
    const mockAi = mockGeminiResponse(JSON.stringify({ storeName: "No Category Shop", total: 10 }));

    const result = await extractDocument(mockAi, {
      base64Data: "fake-base64",
      mimeType: "image/png",
    });

    expect(result.category).toBe("Other");
  });

  it("throws if Gemini returns malformed JSON", async () => {
    const mockAi = mockGeminiResponse("this is not json at all");

    await expect(
      extractDocument(mockAi, { base64Data: "x", mimeType: "image/png" })
    ).rejects.toThrow();
  });

  it("handles an empty items array without error", async () => {
    const mockAi = mockGeminiResponse(
      JSON.stringify({ storeName: "Empty Cart Store", category: "Groceries", total: 0, items: [] })
    );

    const result = await extractDocument(mockAi, { base64Data: "x", mimeType: "image/png" });

    expect(result.items).toEqual([]);
  });

  it("defaults to an empty object if Gemini returns an empty string", async () => {
    const mockAi = mockGeminiResponse("");

    const result = await extractDocument(mockAi, { base64Data: "x", mimeType: "image/png" });

    // Falls through to "{}" per the `response.text || "{}"` fallback,
    // then category gets corrected to "Other"
    expect(result.category).toBe("Other");
  });

  it("propagates errors thrown by the Gemini API itself", async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("Gemini API unavailable")),
      },
    } as any;

    await expect(
      extractDocument(mockAi, { base64Data: "x", mimeType: "image/png" })
    ).rejects.toThrow("Gemini API unavailable");
  });
});