import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  DEFAULT_PUBLISHED_URL,
  getCandidateCsvUrls,
  parseApbsCsvText,
  parseLpjCsvText
} from "./src/lib/sheetParser.js";

dotenv.config();

const DEFAULT_SHEET_ID = "1Eg8UBRpKMufAtvl6EZqDSvlIFFhVc--EZFzCHHHRn8M";
const DEFAULT_LPJ_GID = "1399834495";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Enable CORS for API routes
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Fetch and parse live Google Sheet CSV data
  const handleApbsDataRequest = async (req: express.Request, res: express.Response) => {
    try {
      const rawInput = (req.query.sheetId as string) || DEFAULT_PUBLISHED_URL;
      const candidateUrls = getCandidateCsvUrls(rawInput);

      let csvText = "";
      let lastErrorStatus = 0;

      for (const url of candidateUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            redirect: "follow"
          });

          if (response.ok) {
            const text = await response.text();
            const isHtml =
              text.trim().toLowerCase().startsWith("<!doctype html") ||
              text.trim().toLowerCase().startsWith("<html");
            if (!isHtml && text.length > 20) {
              csvText = text;
              break;
            }
          } else {
            lastErrorStatus = response.status;
          }
        } catch (e) {
          console.warn(`Candidate URL fetch error (${url}):`, e);
        }
      }

      if (!csvText) {
        throw new Error(
          `Gagal membaca Google Sheet (HTTP ${lastErrorStatus || 404}). Google Sheet belum dapat diakses secara publik.\n\n` +
            `Langkah Penanganan jika Spreadsheet di Drive Bersama / Grup Tim:\n` +
            `1. Buka File Google Sheet Anda.\n` +
            `2. Klik menu 'File' -> 'Publikasikan ke web' (Publish to web).\n` +
            `3. Pilih opsi 'Nilai yang dipisahkan koma (.csv)' -> Klik tombol 'Publikasikan'.\n` +
            `4. Atau pastikan menu 'Bagikan' (Share) diubah ke 'Siapa saja yang memiliki link' (Viewer).`
        );
      }

      const parsedData = parseApbsCsvText(csvText, rawInput);

      res.json({
        success: true,
        ...parsedData
      });
    } catch (error: any) {
      console.error("Error fetching APBS sheet:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Gagal memproses data Google Sheet"
      });
    }
  };

  app.get("/api/apbs-data", handleApbsDataRequest);
  app.get("/api/apbs-data/*", handleApbsDataRequest);

  // API Route: Fetch live LPJ Log from Google Sheet tab LOG_PENGAJUAN_LPJ
  app.get("/api/lpj-data", async (req, res) => {
    try {
      const rawInput = (req.query.sheetId as string) || DEFAULT_SHEET_ID;
      const cleanMatch = rawInput.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
      const sheetId = cleanMatch ? cleanMatch[1] : (rawInput.includes("/") ? DEFAULT_SHEET_ID : rawInput);
      const gid = (req.query.gid as string) || DEFAULT_LPJ_GID;

      const lpjUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const response = await fetch(lpjUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        redirect: "follow"
      });

      if (!response.ok) {
        return res.json({ success: true, submissions: [] });
      }

      const csvText = await response.text();
      if (csvText.startsWith("<!DOCTYPE") || csvText.startsWith("<html")) {
        return res.json({ success: true, submissions: [] });
      }

      const submissions = parseLpjCsvText(csvText);
      res.json({
        success: true,
        submissions,
        total: submissions.length
      });
    } catch (error: any) {
      console.error("Error fetching LPJ data:", error);
      res.json({ success: true, submissions: [], error: error.message });
    }
  });

  // API Route: Sync single submission or batch to Google Apps Script Web App
  app.post("/api/sync-submission", async (req, res) => {
    try {
      const { webAppUrl, submission, submissions, action = "save", pin } = req.body;
      const targetUrl = webAppUrl || process.env.APPS_SCRIPT_URL;

      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.json({
          success: false,
          reason: "NO_WEBHOOK_URL",
          message: "Google Apps Script Web App URL belum diatur. Silakan masukkan Web App URL di menu Apps Script."
        });
      }

      const payload = {
        action,
        pin,
        ...(submission ? submission : {}),
        submissions: submissions || (submission ? [submission] : [])
      };

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      const responseText = await response.text();
      let parsedResponse: any = {};
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        parsedResponse = { text: responseText };
      }

      res.json({
        success: true,
        targetUrl,
        result: parsedResponse,
        message: "Data berhasil dikirim ke Google Apps Script Spreadsheet!"
      });
    } catch (error: any) {
      console.error("Error syncing to Google Apps Script:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Gagal menghubungi Webhook Google Apps Script"
      });
    }
  });

  app.post("/api/delete-submission", async (req, res) => {
    const { subId, pin, webAppUrl } = req.body;
    if (pin !== "123") {
      return res.status(403).json({
        success: false,
        error: "PIN Otorisasi Salah! Gunakan PIN 123."
      });
    }

    const targetUrl = webAppUrl || process.env.APPS_SCRIPT_URL;
    if (targetUrl && targetUrl.startsWith("http")) {
      try {
        await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", subId, pin: "123" }),
          redirect: "follow"
        });
      } catch (err) {
        console.warn("Failed forwarding delete to Apps Script Webhook:", err);
      }
    }

    console.log(`[DELETE ACTION] Submission ID ${subId} deleted with verified PIN 123.`);
    res.json({
      success: true,
      subId,
      message: "Data pengajuan berhasil dihapus dari aplikasi & disinkronkan ke Google Sheet."
    });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Monitoring APBS Lazuardi running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
