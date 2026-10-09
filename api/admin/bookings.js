const { db, json, method, requireAdmin, readBody, cleanText } = require("../../lib/server");
const STATUSES = new Set(["pending", "confirmed", "completed", "cancelled"]);
module.exports = async function handler(req, res) {
  const session = requireAdmin(req, res, req.method !== "GET");
  if (!session) return;
  if (!method(req, res, ["GET", "PATCH"])) return;
  try {
    const sql = db();
    if (req.method === "GET") {
      const status = cleanText(req.query?.status || "", 20);
      const page = Math.max(1, Math.min(10000, Number.parseInt(req.query?.page || "1", 10) || 1));
      const limit = 30;
      let rows;
      let countRows;
      if (status && STATUSES.has(status)) {
        rows = await sql`SELECT id, reference, customer_name, phone, puja_name, price, booking_date, time_slot, location, notes, status, admin_note, created_at, updated_at
          FROM bookings WHERE status = ${status} ORDER BY booking_date DESC, created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
        countRows = await sql`SELECT COUNT(*)::int AS total FROM bookings WHERE status = ${status}`;
      } else {
        rows = await sql`SELECT id, reference, customer_name, phone, puja_name, price, booking_date, time_slot, location, notes, status, admin_note, created_at, updated_at
          FROM bookings ORDER BY booking_date DESC, created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
        countRows = await sql`SELECT COUNT(*)::int AS total FROM bookings`;
      }
      return json(res, 200, { bookings: rows, total: countRows[0].total, page, page_size: limit });
    }
    if (!req.headers.origin || new URL(req.headers.origin).host.toLowerCase() !== String(req.headers.host || "").toLowerCase()) {
      return json(res, 403, { error: "सुरक्षा जाँच पूरी नहीं हुई। पृष्ठ को पुनः खोलें।" });
    }
    const body = readBody(req) || {};
    const id = Number.parseInt(body.id, 10);
    const status = cleanText(body.status, 20);
    const adminNote = cleanText(body.admin_note, 700);
    if (!Number.isSafeInteger(id) || id < 1 || !STATUSES.has(status)) {
      return json(res, 400, { error: "निवेदन अथवा स्थिति का विवरण सही नहीं है।" });
    }
    const updated = await sql`UPDATE bookings SET status = ${status}, admin_note = ${adminNote || null}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, reference, status, admin_note, updated_at`;
    if (!updated.length) return json(res, 404, { error: "यह निवेदन नहीं मिला।" });
    return json(res, 200, { message: "निवेदन की स्थिति बदल दी गई है।", booking: updated[0] });
  } catch (error) {
    console.error("Admin bookings failed:", error?.message || "unknown error");
    json(res, 500, { error: "निवेदन-सूची प्राप्त नहीं हो सकी। कृपया बाद में प्रयास करें।" });
  }
};
