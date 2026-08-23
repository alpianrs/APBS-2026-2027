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
      let targetUrl = (
        webAppUrl ||
        process.env.APPS_SCRIPT_URL ||
        "https://script.google.com/macros/s/AKfycbx3HhPFgplKFWXiPOqiyAmf1y38c-GEjqq73lX5SZSuwEN2k-QSQEhL3iN_aaf863K7/exec"
      ).trim();

      // Auto-convert /dev to /exec if present
      if (targetUrl.includes("/macros/s/") && targetUrl.endsWith("/dev")) {
        targetUrl = targetUrl.replace(/\/dev$/, "/exec");
      } else if (targetUrl.includes("/macros/s/") && targetUrl.includes("/dev?")) {
        targetUrl = targetUrl.replace("/dev?", "/exec?");
      }

      if (!targetUrl || !targetUrl.startsWith("http")) {
        return res.json({
          success: false,
          reason: "NO_WEBHOOK_URL",
          message: "URL Google Apps Script Web App belum diisi. Silakan masukkan Web App URL di menu Apps Script."
        });
      }

      // Check if user accidentally pasted Google Sheets edit URL instead of Web App URL
      if (targetUrl.includes("docs.google.com/spreadsheets")) {
        return res.json({
          success: false,
          reason: "INVALID_SPREADSHEET_URL",
          message: "URL yang dimasukkan adalah link Google Spreadsheet, bukan link Web App Apps Script. Silakan gunakan URL Web App yang berakhiran /exec."
        });
      }

      // If ping action, attempt GET first to verify script is active and deployed
      if (action === "ping") {
        try {
          const getRes = await fetch(targetUrl, {
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            redirect: "follow"
          });
          const getText = await getRes.text();
          let getJson: any = null;
          try {
            getJson = JSON.parse(getText);
          } catch {}

          if (getJson && (getJson.status === "ok" || getJson.success)) {
            return res.json({
              success: true,
              targetUrl,
              result: getJson,
              message: "Koneksi Google Apps Script Web App Berhasil & Aktif!"
            });
          }
        } catch (getErr) {
          console.warn("Ping GET attempt failed, trying POST:", getErr);
        }
      }

      const payload = {
        action,
        pin,
        ...(submission ? submission : {}),
        submissions: submissions || (submission ? [submission] : [])
      };

      let responseText = "";
      let parsedResponse: any = {};
      let isJson = false;

      // Strategy 1: Try POST
      try {
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload),
          redirect: "follow"
        });

        responseText = await response.text();
        try {
          parsedResponse = JSON.parse(responseText);
          isJson = true;
        } catch {
          isJson = false;
        }
      } catch (postErr) {
        console.warn("POST to Apps Script failed, trying GET fallback:", postErr);
      }

      // Strategy 2: If POST failed or returned HTML, try GET with query parameter
      if (!isJson) {
        try {
          const encodedPayload = encodeURIComponent(JSON.stringify(payload));
          const getUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}data=${encodedPayload}`;
          const getRes = await fetch(getUrl, {
            method: "GET",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            redirect: "follow"
          });
          const getTxt = await getRes.text();
          try {
            parsedResponse = JSON.parse(getTxt);
            isJson = true;
            responseText = getTxt;
          } catch {
            isJson = false;
          }
        } catch (getErr) {
          console.warn("GET fallback failed:", getErr);
        }
      }

      // Check if Google returned an HTML error page (e.g. 404, authorization needed, etc.)
      const isHtmlResponse =
        !isJson &&
        (responseText.toLowerCase().includes("<!doctype") ||
          responseText.toLowerCase().includes("<html") ||
          responseText.toLowerCase().includes("the page cannot be found") ||
          responseText.toLowerCase().includes("the page could not be loaded"));

      if (isHtmlResponse || !isJson) {
        return res.json({
          success: false,
          message: "Google Apps Script mengembalikan halaman HTML. Silakan salin Kode Apps Script V3.0 terbaru di menu Apps Script, simpan di Google Sheet, lalu Deploy Versi Baru (Siapa Saja / Anyone)."
        });
      }

      if (parsedResponse.success === false) {
        return res.json({
          success: false,
          message: parsedResponse.error || parsedResponse.message || "Gagal memproses data di Google Apps Script."
        });
      }

      res.json({
        success: true,
        targetUrl,
        result: parsedResponse,
        message: "Data berhasil dicatat ke Google Sheet (tab LOG_PENGAJUAN_LPJ)!"
      });
    } catch (error: any) {
      console.error("Error syncing to Google Apps Script:", error);
      res.json({
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

    const targetUrl = (webAppUrl || process.env.APPS_SCRIPT_URL || "").trim();
    if (targetUrl && targetUrl.startsWith("http") && !targetUrl.includes("docs.google.com/spreadsheets")) {
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
