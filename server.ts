import "dotenv/config";
import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import fs from "fs";
import { EXPENSE_CATEGORIES } from "./src/types.ts";
// Initialize Firebase Admin
try {
  // Try to find the service account key locally (for local dev)
  if (fs.existsSync("./firebase-admin-key.json")) {
    const serviceAccount = JSON.parse(fs.readFileSync("./firebase-admin-key.json", "utf-8"));
    initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    // Rely on application default credentials
    initializeApp({
      credential: applicationDefault()
    });
  }
} catch (error) {
  console.warn("Failed to initialize Firebase Admin:", error);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ storage: multer.memoryStorage() });
const PORT = Number(process.env.PORT ?? 3000);
const HMR_PORT = Number(process.env.HMR_PORT ?? 24678);

async function startServer() {
  const app = express();

  app.use(express.json());

  // --- API Routes ---

  app.post("/api/extract", upload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert buffer to base64
      const base64Data = req.file.buffer.toString("base64");
      
      const prompt = `
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

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: req.file.mimetype,
            },
          },
        ],
      });

      let jsonStr = response.text || "{}";
      // Clean up potential markdown formatting
      if (jsonStr.startsWith("\`\`\`json")) {
        jsonStr = jsonStr.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      }

      const extractedData = JSON.parse(jsonStr);

      // Validate category against the allowed list — Gemini can occasionally
      // drift from the exact strings we gave it, so fall back safely.
      if (!EXPENSE_CATEGORIES.includes(extractedData.category)) {
        extractedData.category = "Other";
      }

      res.json(extractedData);
    } catch (error) {
      console.error("Error extracting document data:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { port: HMR_PORT },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other server or run with a different PORT.`);
      process.exit(1);
    }

    throw error;
  });
}

startServer().catch(console.error);
