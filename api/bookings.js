const { db, json, method, readBody, normaliseDigits, cleanText, clientKey, allowRate, notifyAdmin } = require("../lib/server");
const ALLOWED_TIMES = new Set(["प्रातःकाल (६ से ९ बजे)", "प्रातः (९ से १२ बजे)", "दोपहर (१२ से ४ बजे)", "सायंकाल (४ से ८ बजे)", "समय पर चर्चा कर सकते हैं"]);
function indiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function makeReference() {
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).replace(/-/g, "");
  return "VP" + date + "-" + require("node:crypto").randomBytes(3).toString("hex").toUpperCase();
}
module.exports = async function handler(req, res) {
  if (!method(req, res, ["POST"])) return;
  try {
    const sql = db();
    const body = readBody(req);
    if (!body) return json(res, 400, { error: "कृपया निवेदन-पत्र सही प्रकार से भरें।" });
    const ipKey = clientKey(req);
    const ipAllowed = await allowRate(sql, "booking-ip", ipKey, 6, 60 * 60 * 1000);
    if (!ipAllowed) return json(res, 429, { error: "इस स्थान से बहुत अधिक निवेदन आए हैं। कृपया एक घंटे बाद पुनः प्रयास करें।" });
    const name = cleanText(body.name, 80);
    const phone = normaliseDigits(body.phone).replace(/[\s()-]/g, "");
    const date = cleanText(body.date, 10);
    const time = cleanText(body.time, 80);
    const location = cleanText(body.location, 250);
    const notes = cleanText(body.notes, 700);
    const slug = cleanText(body.puja_slug || "satyanarayan", 60);
    if (name.length < 2) return json(res, 400, { error: "कृपया अपना पूरा नाम लिखें।" });
    if (!/^[6-9]\d{9}$/.test(phone)) return json(res, 400, { error: "कृपया भारत का मान्य १० अंकों का मोबाइल क्रमांक लिखें।" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < indiaToday()) return json(res, 400, { error: "कृपया आज या उसके बाद की सही तिथि चुनें।" });
    const parsedDate = new Date(date + "T00:00:00Z");
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return json(res, 400, { error: "कृपया सही तिथि चुनें।" });
    if (!ALLOWED_TIMES.has(time)) return json(res, 400, { error: "कृपया पूजन का समय चुनें।" });
    if (location.length < 5) return json(res, 400, { error: "कृपया पूजन का पूरा स्थान लिखें।" });
    if (notes.length > 700) return json(res, 400, { error: "विशेष जानकारी ७०० अक्षरों से कम रखें।" });
    const phoneKey = require("node:crypto").createHmac("sha256", process.env.SESSION_SECRET).update(phone).digest("hex");
    if (!(await allowRate(sql, "booking-phone", phoneKey, 3, 60 * 60 * 1000))) {
      return json(res, 429, { error: "इस मोबाइल क्रमांक से बहुत अधिक निवेदन आए हैं। कृपया बाद में पुनः प्रयास करें।" });
    }
    const services = await sql`SELECT name, price FROM puja_services WHERE slug = ${slug} AND active = TRUE LIMIT 1`;
    if (!services.length) return json(res, 400, { error: "यह पूजन अभी उपलब्ध नहीं है।" });
    const reference = makeReference();
    const rows = await sql`INSERT INTO bookings
      (reference, customer_name, phone, puja_slug, puja_name, price, booking_date, time_slot, location, notes, status)
      VALUES (${reference}, ${name}, ${phone}, ${slug}, ${services[0].name}, ${services[0].price}, ${date}, ${time}, ${location}, ${notes || null}, 'pending')
      RETURNING reference, customer_name, phone, puja_name, price, booking_date, time_slot, location, notes, status, created_at`;
    const booking = rows[0];
    await notifyAdmin(booking);
    json(res, 201, {
      message: "आपका पूजन निवेदन प्राप्त हो गया है। अभी तिथि की पुष्टि नहीं हुई है।",
      booking: { reference: booking.reference, puja_name: booking.puja_name, price: Number(booking.price), booking_date: booking.booking_date, time_slot: booking.time_slot, status: booking.status }
    });
  } catch (error) {
    console.error("Booking request failed:", error?.message || "unknown error");
    json(res, 500, { error: "निवेदन अभी पूरा नहीं हो सका। कृपया कुछ समय बाद पुनः प्रयास करें।" });
  }
};
