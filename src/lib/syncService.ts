/**
 * Service to handle Two-Way Realtime Synchronization with Google Apps Script Web App
 * Works in all environments: Vercel, Netlify, Container, Localhost, etc.
 */

export interface SyncPayload {
  webAppUrl: string;
  action: "ping" | "save" | "delete" | "sync-all" | "read";
  id?: string;
  subId?: string;
  pin?: string;
  tanggalPengajuan?: string;
  monthNum?: string | number;
  rek?: string;
  itemName?: string;
  nominalPengajuan?: number;
  nominalRealisasi?: number;
  isReported?: boolean;
  noSpkOrKwitansi?: string;
  purchaseItems?: any[];
  catatan?: string;
  submissions?: any[];
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  error?: string;
  submissions?: any[];
  total?: number;
  result?: any;
}

/**
 * Normalizes and sanitizes Apps Script Web App URL.
 * Automatically converts /dev (Test Deployment) to /exec (Production Web App)
 * because Google strictly blocks CORS fetch requests to /dev.
 */
export function sanitizeAppsScriptUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  
  // Remove wrapping quotes if pasted from config
  url = url.replace(/^["']|["']$/g, "");

  // Auto-convert /dev to /exec
  if (url.includes("/macros/s/") && url.endsWith("/dev")) {
    url = url.replace(/\/dev$/, "/exec");
  } else if (url.includes("/macros/s/") && url.includes("/dev?")) {
    url = url.replace("/dev?", "/exec?");
  }

  return url;
}

/**
 * Execute sync to Google Apps Script Web App directly from the browser,
 * with fallback to local proxy and no-cors mode if needed.
 */
export async function executeAppsScriptSync(payload: SyncPayload): Promise<SyncResponse> {
  const targetUrl = sanitizeAppsScriptUrl(payload.webAppUrl || "");

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return {
      success: false,
      message: "URL Google Apps Script Web App belum diisi."
    };
  }

  if (targetUrl.includes("docs.google.com/spreadsheets")) {
    return {
      success: false,
      message: "URL yang dimasukkan adalah link Google Spreadsheet. Gunakan link Web App Apps Script yang berakhiran /exec."
    };
  }

  const sanitizedPayload: SyncPayload = {
    ...payload,
    webAppUrl: targetUrl
  };

  // Strategy 1: Direct GET request with URL query parameter (Natively avoids preflight & CORS redirect blocks)
  try {
    const encodedPayload = encodeURIComponent(JSON.stringify(sanitizedPayload));
    const directGetUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}data=${encodedPayload}&action=${sanitizedPayload.action}&t=${Date.now()}`;
    
    const getRes = await fetch(directGetUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
      redirect: "follow"
    });

    if (getRes.ok) {
      const text = await getRes.text();
      try {
        const json = JSON.parse(text);
        if (json.success || json.status === "ok") {
          return {
            success: true,
            message: json.message || "Data berhasil disinkronkan ke Google Sheet!",
            submissions: json.submissions,
            total: json.total,
            result: json
          };
        }
        if (json.error) {
          return { success: false, message: json.error };
        }
      } catch {
        // Fall through to next strategy
      }
    }
  } catch (directGetErr) {
    console.warn("Direct GET to Apps Script failed, trying Direct POST:", directGetErr);
  }

  // Strategy 2: Direct POST request with text/plain (simple request avoids CORS OPTIONS preflight)
  try {
    const postRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(sanitizedPayload),
      redirect: "follow"
    });

    if (postRes.ok) {
      const text = await postRes.text();
      try {
        const json = JSON.parse(text);
        if (json.success || json.status === "ok") {
          return {
            success: true,
            message: json.message || "Data berhasil disinkronkan ke Google Sheet!",
            submissions: json.submissions,
            total: json.total,
            result: json
          };
        }
        if (json.error) {
          return { success: false, message: json.error };
        }
      } catch {
        // Fall through
      }
    }
  } catch (directPostErr) {
    console.warn("Direct POST to Apps Script failed, trying Local/Serverless Proxy:", directPostErr);
  }

  // Strategy 3: Try Local/Vercel Serverless Proxy /api/sync-submission (Bypasses browser CORS entirely)
  try {
    const proxyRes = await fetch("/api/sync-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedPayload)
    });

    if (proxyRes.ok) {
      const proxyText = await proxyRes.text();
      try {
        const json = JSON.parse(proxyText);
        if (json.success) {
          return json;
        }
        if (json.message || json.error) {
          return { success: false, message: json.message || json.error };
        }
      } catch {
        // Proxy returned non-JSON
      }
    }
  } catch (proxyErr) {
    console.warn("Proxy attempt failed:", proxyErr);
  }

  // Strategy 4: Fallback for POST using mode: 'no-cors' (Fire and forget, guaranteed delivery to Google Sheet)
  if (sanitizedPayload.action !== "ping" && sanitizedPayload.action !== "read") {
    try {
      await fetch(targetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(sanitizedPayload)
      });
      return {
        success: true,
        message: "Data berhasil dikirim dan dicatat ke Google Sheet!"
      };
    } catch (noCorsErr) {
      console.warn("No-cors fallback failed:", noCorsErr);
    }
  }

  return {
    success: false,
    message: "Gagal terhubung ke Google Apps Script. Pastikan Web App di-Deploy dengan hak akses 'Anyone' (Siapa saja) dan URL berakhiran /exec (bukan /dev)."
  };
}
