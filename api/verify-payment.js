const { createHmac, timingSafeEqual } = require("node:crypto");
const { getSql } = require("../lib/db");
const { notifyBooking } = require("../lib/notifications");
function safeEqualHex(actual, expected) {
    if (typeof actual !== "string" || !/^[a-f0-9]{64}$/i.test(actual)) return false;
    const a = Buffer.from(actual, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
}
async function confirmPayment(orderId, paymentId, signature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !process.env.RAZORPAY_KEY_ID) throw new Error("Payment verification is not configured");
    const expected = createHmac("sha256", secret).update(orderId + "|" + paymentId).digest("hex");
    if (!safeEqualHex(signature, expected)) {
        const e = new Error("Invalid payment signature"); e.statusCode = 400; throw e;
    }
    const response = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
        headers: { Authorization: "Basic " + Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + secret).toString("base64") }
    });
    const payment = await response.json().catch(() => ({}));
    if (!response.ok || payment.order_id !== orderId || payment.amount !== 210000 ||
        payment.currency !== "INR" || payment.status !== "captured") {
        const e = new Error("Payment not captured or mismatched"); e.statusCode = 400; throw e;
    }
    const sql = getSql();
    const rows = await sql`UPDATE bookings SET status = 'paid', razorpay_payment_id = ${paymentId},
        paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
        WHERE razorpay_order_id = ${orderId} AND amount_paise = 210000
          AND status <> 'paid'
        RETURNING id, customer_name, customer_phone, puja_date, puja_time, puja_address, requirements, status`;
    if (!rows.length) {
        const existing = await sql`SELECT id, status, razorpay_payment_id FROM bookings WHERE razorpay_order_id = ${orderId} LIMIT 1`;
        if (!existing.length || existing[0].status !== "paid" || existing[0].razorpay_payment_id !== paymentId) {
            const e = new Error("Booking not found"); e.statusCode = 404; throw e;
        }
        return { bookingId: existing[0].id, alreadyProcessed: true };
    }
    const booking = rows[0];
    try {
        await notifyBooking(booking);
        await sql`UPDATE bookings SET notification_status = 'sent', notification_error = NULL, updated_at = NOW() WHERE id = ${booking.id}`;
    } catch (error) {
        console.error("Payment succeeded but WhatsApp notifications failed:", error.message);
        await sql`UPDATE bookings SET notification_status = 'failed', notification_error = ${error.message.slice(0, 1500)}, updated_at = NOW() WHERE id = ${booking.id}`;
    }
    return { bookingId: booking.id, alreadyProcessed: false };
}
module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "केवल POST अनुरोध स्वीकार है।" }); }
    const b = req.body || {};
    const orderId = b.razorpay_order_id, paymentId = b.razorpay_payment_id, signature = b.razorpay_signature;
    if (![orderId, paymentId, signature].every(v => typeof v === "string" && v.length > 0 && v.length < 300)) {
        return res.status(400).json({ error: "भुगतान सत्यापन की जानकारी अधूरी है।" });
    }
    try {
        const result = await confirmPayment(orderId, paymentId, signature);
        return res.status(200).json({ success: true, bookingId: result.bookingId });
    } catch (error) {
        console.error("Payment verification failed:", error.message);
        return res.status(error.statusCode || 500).json({ error: error.statusCode === 400
            ? "भुगतान की पुष्टि नहीं हो सकी। कृपया सहायता से संपर्क करें।"
            : "भुगतान सत्यापित करने में समस्या हुई। कृपया सहायता से संपर्क करें।" });
    }
};
module.exports.confirmPayment = confirmPayment;
