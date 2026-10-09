const { db, json, method, readBody, cleanText, safeEqual, createSession, clientKey, allowRate } = require("../../lib/server");
module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    if (!req.headers.origin || new URL(req.headers.origin).host.toLowerCase() !== String(req.headers.host || "").toLowerCase()) {
      return json(res, 403, { error: "सुरक्षा जाँच पूरी नहीं हुई। पृष्ठ को पुनः खोलें।" });
    }
    const usernameExpected = process.env.ADMIN_USERNAME;
    const passwordExpected = process.env.ADMIN_PASSWORD;
    if (!usernameExpected || !passwordExpected || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      return json(res, 503, { error: "व्यवस्थापक प्रवेश अभी विन्यस्त नहीं है। पर्यावरण चर जाँचें।" });
    }
    const sql = db();
    const key = clientKey(req);
    if (!(await allowRate(sql, "admin-login", key, 8, 15 * 60 * 1000))) {
      return json(res, 429, { error: "बहुत बार प्रवेश का प्रयास हुआ है। १५ मिनट बाद पुनः प्रयास करें।" });
    }
    const body = readBody(req) || {};
    const username = cleanText(body.username, 100);
    const password = String(body.password || "");
    if (!safeEqual(username, usernameExpected) || !safeEqual(password, passwordExpected)) {
      return json(res, 401, { error: "प्रवेश नाम अथवा गुप्तशब्द सही नहीं है।" });
    }
    createSession(req, res, usernameExpected);
    json(res, 200, { message: "प्रवेश सफल हुआ।", username: usernameExpected });
  } catch (error) {
    console.error("Admin login failed:", error?.message || "unknown error");
    json(res, 500, { error: "अभी प्रवेश नहीं हो सका। कृपया बाद में प्रयास करें।" });
  }
};
