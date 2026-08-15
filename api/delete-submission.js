// Vercel Serverless Function: /api/delete-submission
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { subId, pin, webAppUrl } = req.body || {};
    const targetUrl = (webAppUrl || process.env.APPS_SCRIPT_URL || "").trim();

    if (targetUrl && targetUrl.startsWith("http")) {
      const payload = { action: "delete", subId, pin };
      const encodedPayload = encodeURIComponent(JSON.stringify(payload));
      const getUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}data=${encodedPayload}&action=delete`;

      await fetch(getUrl, { method: "GET" }).catch(() => {});
    }

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
