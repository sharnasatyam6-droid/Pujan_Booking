const { db, json, method, requireAdmin } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  if (!requireAdmin(req, res)) return;
  try {
    const sql = db();
    const rows = await sql`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM bookings`;
    json(res, 200, { stats: rows[0] });
  } catch (error) {
    console.error("Admin statistics failed:", error?.message || "unknown error");
    json(res, 500, { error: "आँकड़े प्राप्त नहीं हो सके।" });
  }
};
