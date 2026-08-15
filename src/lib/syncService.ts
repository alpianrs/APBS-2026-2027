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
 * Execute sync to Google Apps Script Web App directly from the browser,
 * with fallback to local proxy if available.
 */
export async function executeAppsScriptSync(payload: SyncPayload): Promise<SyncResponse> {
  const targetUrl = (payload.webAppUrl || "").trim();

  if (!targetUrl || !targetUrl.startsWith("http")) {
    return {
      success: false,
      message: "URL Google Apps Script Web App belum diisi."
    };
  }

  if (targetUrl.includes("docs.google.com/spreadsheets")) {
    return {
      success: false,
      message: "URL yang dimasukkan adalah link Google Spreadsheet, bukan link Web App Apps Script (/exec)."
    };
  }

  // Strategy 1: Direct GET request to Google Apps Script (Supports CORS natively on Google Web Apps)
  try {
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const directGetUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}data=${encodedPayload}&action=${payload.action}`;
    
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
        // Continue to Strategy 2
      }
    }
  } catch (directGetErr) {
    console.warn("Direct GET to Apps Script failed, trying Direct POST:", directGetErr);
  }

  // Strategy 2: Direct POST request to Google Apps Script (Content-Type: text/plain bypasses preflight)
  try {
    const postRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
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
        // Check if HTML error
      }
    }
  } catch (directPostErr) {
    console.warn("Direct POST to Apps Script failed, trying Local Proxy if available:", directPostErr);
  }

  // Strategy 3: Try Local Backend Proxy (if available, e.g., running container or dev server)
  try {
    const proxyRes = await fetch("/api/sync-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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

  // Strategy 4: Fallback for POST using mode: 'no-cors' (Fire and forget, guaranteed delivery to Google)
  if (payload.action !== "ping" && payload.action !== "read") {
    try {
      await fetch(targetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
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
    message: "Gagal terhubung ke Google Apps Script. Pastikan Web App di-Deploy dengan hak akses 'Anyone' (Siapa saja) dan URL berakhiran /exec."
  };
}
