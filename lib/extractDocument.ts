import { GoogleGenAI } from "@google/genai";
import { EXPENSE_CATEGORIES, ExtractedData } from "../src/types";


export interface ExtractInput {
  base64Data: string;
  mimeType: string;
}

const EXTRACTION_PROMPT = `
  Analyze this document (receipt, invoice, or financial document).
  Extract the following fields and return them as a clean JSON object.
  - storeName: The name of the store or vendor.
  - date: The date of the transaction.
  - subtotal: The amount before tax.
  - tax: The tax amount.
  - total: The total amount paid.
  - category: Choose the single best-fitting category from this exact list
    (return the string exactly as written): ${EXPENSE_CATEGORIES.join(", ")}.
  - items: An array of line items with "name", "quantity", and "price".

  Return ONLY the raw JSON object, without markdown formatting like \`\`\`json.
`;

/**
 * Calls Gemini to extract structured expense data from a receipt/invoice
 * image, and validates the returned category against our fixed list.
 * Extracted from server.ts so it's testable without spinning up Express.
 */
export async function extractDocument(
  ai: GoogleGenAI,
  input: ExtractInput
): Promise<ExtractedData> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      EXTRACTION_PROMPT,
      {
        inlineData: {
          data: input.base64Data,
          mimeType: input.mimeType,
        },
      },
    ],
  });

  let jsonStr = response.text || "{}";
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
  }

  const extractedData = JSON.parse(jsonStr);

  if (!EXPENSE_CATEGORIES.includes(extractedData.category)) {
    extractedData.category = "Other";
  }

  return extractedData;
}