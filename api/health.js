const { db, json, method } = require("../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["GET"])) return;
  try {
    await db()`SELECT 1`;
    json(res, 200, { status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error?.message || "unknown error");
    json(res, 503, { status: "unavailable", error: "सेवा अभी उपलब्ध नहीं है। व्यवस्थापक से सम्पर्क करें।" });
  }
};
