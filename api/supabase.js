const SUPABASE_URL = "https://ffusacesuumigyeoshkl.supabase.co";
const SUPABASE_API_KEY = "sb_publishable_n8uU9W5EP3CqMSBoeiXO6g_3DuxrpcN";
const ALLOWED_AREAS = new Set(["auth", "rest"]);

module.exports = async function handler(req, res) {
  const area = String(req.query.area || "");
  const path = String(req.query.path || "");

  if (!ALLOWED_AREAS.has(area) || !path.startsWith("/")) {
    res.status(400).json({ message: "Invalid Supabase proxy request." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const targetUrl = `${SUPABASE_URL}/${area}/v1${path}`;
  const headers = {
    apikey: SUPABASE_API_KEY,
    Authorization: req.headers.authorization || `Bearer ${SUPABASE_API_KEY}`,
    "Content-Type": "application/json"
  };

  if (req.headers.prefer) {
    headers.Prefer = req.headers.prefer;
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : normalizeBody(req.body)
    });
    const text = await response.text();

    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (error) {
    res.status(502).json({
      message: "Supabase request failed.",
      detail: error?.message || String(error)
    });
  }
};

function normalizeBody(body) {
  if (body === undefined || body === null || body === "") {
    return undefined;
  }

  return typeof body === "string" ? body : JSON.stringify(body);
}
