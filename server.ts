import "dotenv/config";
import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import fs from "fs";
import { extractDocument } from "./lib/extractDocument.ts";

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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches Upload.tsx's stated limit
});
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

      const base64Data = req.file.buffer.toString("base64");

      const extractedData = await extractDocument(ai, {
        base64Data,
        mimeType: req.file.mimetype,
      });

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