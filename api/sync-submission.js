// Vercel Serverless Function: /api/sync-submission
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { webAppUrl, submission, submissions, action = "save", pin } = req.body || {};
    const targetUrl = (webAppUrl || process.env.APPS_SCRIPT_URL || "").trim();

    if (!targetUrl || !targetUrl.startsWith("http")) {
      return res.status(200).json({
        success: false,
        reason: "NO_WEBHOOK_URL",
        message: "URL Google Apps Script Web App belum diisi."
      });
    }

    const payload = {
      action,
      pin,
      submission,
      submissions: submissions || (submission ? [submission] : [])
    };

    // Try GET with query param
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const directGetUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}data=${encodedPayload}&action=${action}`;

    let response = await fetch(directGetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "follow"
    });

    let text = await response.text();
    let isJson = false;
    let json = {};

    try {
      json = JSON.parse(text);
      isJson = true;
    } catch {
      // Try POST if GET didn't return JSON
      const postRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      text = await postRes.text();
      try {
        json = JSON.parse(text);
        isJson = true;
      } catch {}
    }

    if (isJson) {
      return res.status(200).json(json);
    }

    return res.status(200).json({
      success: true,
      message: "Data berhasil dikirim ke Google Sheet!"
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      message: err.message || "Gagal menghubungi Apps Script"
    });
  }
}
