const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

let sqlClient;
function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}
function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.end(JSON.stringify(payload));
}
function method(req, res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  if (!allowed.includes(req.method)) {
    json(res, 405, { error: "यह अनुरोध विधि स्वीकार्य नहीं है।" });
    return false;
  }
  return true;
}
function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}
function normaliseDigits(value) {
  return String(value ?? "").replace(/[०-९]/g, d => String("०१२३४५६७८९".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return secret;
}
function sign(value) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}
function cookieOptions(req, value, maxAge) {
  const secure = req.headers["x-forwarded-proto"] === "https" || process.env.VERCEL === "1";
  return "pujan_admin=" + value + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + maxAge + (secure ? "; Secure" : "");
}
function createSession(req, res, username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  res.setHeader("Set-Cookie", cookieOptions(req, payload + "." + sign(payload), 12 * 60 * 60));
}
function clearSession(req, res) {
  res.setHeader("Set-Cookie", cookieOptions(req, "", 0));
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf("=");
    return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}
function getSession(req) {
  try {
    const token = cookies(req).pujan_admin;
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !safeEqual(sign(parts[0]), parts[1])) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!payload.u || !payload.exp || payload.exp < Date.now()) return null;
    return { username: payload.u };
  } catch { return null; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = String(req.headers.host || "").toLowerCase();
    return parsed.host.toLowerCase() === host && ["https:", "http:"].includes(parsed.protocol);
  } catch { return false; }
}
function requireAdmin(req, res, write = false) {
  const session = getSession(req);
  if (!session) {
    json(res, 401, { error: "प्रवेश की अवधि समाप्त है। कृपया पुनः प्रवेश करें।" });
    return false;
  }
  if (write && !sameOrigin(req)) {
    json(res, 403, { error: "सुरक्षा जाँच पूरी नहीं हुई। पृष्ठ को पुनः खोलें।" });
    return false;
  }
  return session;
}
function clientKey(req) {
  const ip = String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",").pop().trim();
  return crypto.createHmac("sha256", sessionSecret()).update(ip).digest("hex");
}
async function allowRate(sql, scope, key, maxHits, windowMs) {
  const now = Date.now();
  const start = new Date(Math.floor(now / windowMs) * windowMs);
  const rows = await sql`INSERT INTO rate_limits (scope, key_hash, window_start, hits)
    VALUES (${scope}, ${key}, ${start}, 1)
    ON CONFLICT (scope, key_hash, window_start)
    DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits`;
  return Number(rows[0]?.hits || 1) <= maxHits;
}
async function notifyAdmin(booking) {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_NOTIFICATION_EMAIL || !process.env.RESEND_FROM_EMAIL) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [process.env.ADMIN_NOTIFICATION_EMAIL],
        subject: "नया पूजन निवेदन — " + booking.reference,
        text: "नया पूजन निवेदन प्राप्त हुआ।\nनिवेदन क्रमांक: " + booking.reference +
          "\nनाम: " + booking.customer_name + "\nदूरभाष: " + booking.phone +
          "\nपूजन: " + booking.puja_name + "\nशुल्क: ₹" + booking.price +
          "\nतिथि: " + booking.booking_date + "\nसमय: " + booking.time_slot +
          "\nस्थान: " + booking.location + "\nविशेष जानकारी: " + (booking.notes || "नहीं दी गई") +
          "\nस्थिति: पुष्टि की प्रतीक्षा में।"
      })
    });
  } catch (error) {
    console.error("Notification delivery failed:", error?.message || "unknown error");
  }
}
module.exports = { db, json, method, readBody, normaliseDigits, cleanText, safeEqual, createSession, clearSession, requireAdmin, clientKey, allowRate, notifyAdmin };
