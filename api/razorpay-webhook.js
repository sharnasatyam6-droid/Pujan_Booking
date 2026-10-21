const { createHmac, timingSafeEqual } = require("node:crypto");
const { getSql } = require("../lib/db");
const { notifyBooking } = require("../lib/notifications");
module.exports.config = { api: { bodyParser: false } };
async function readRawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
}
function validSignature(rawBody, signature, secret) {
    if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest();
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
async function handleCapturedPayment(payment) {
    if (!payment || payment.status !== "captured" || payment.amount !== 210000 || payment.currency !== "INR") return;
    if (!payment.order_id || !payment.id) return;
    const sql = getSql();
    const rows = await sql`UPDATE bookings SET status = 'paid', razorpay_payment_id = ${payment.id},
        paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
        WHERE razorpay_order_id = ${payment.order_id} AND amount_paise = 210000 AND status = 'pending_payment'
        RETURNING id, customer_name, customer_phone, puja_date, puja_time, puja_address, requirements`;
    if (!rows.length) return;
    const booking = rows[0];
    try {
        await notifyBooking(booking);
        await sql`UPDATE bookings SET notification_status = 'sent', notification_error = NULL, updated_at = NOW() WHERE id = ${booking.id}`;
    } catch (error) {
        console.error("Payment captured; WhatsApp notification failed:", error.message);
        await sql`UPDATE bookings SET notification_status = 'failed', notification_error = ${error.message.slice(0, 1500)}, updated_at = NOW() WHERE id = ${booking.id}`;
    }
}
module.exports = async function handler(req, res) {
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).send("Method not allowed"); }
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send("Webhook is not configured");
    try {
        const rawBody = await readRawBody(req);
        if (!validSignature(rawBody, req.headers["x-razorpay-signature"], secret)) return res.status(400).send("Invalid webhook signature");
        const event = JSON.parse(rawBody.toString("utf8"));
        if (event.event === "payment.captured") await handleCapturedPayment(event.payload?.payment?.entity);
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("Razorpay webhook handler failed:", error.message);
        return res.status(500).send("Webhook processing failed");
    }
};
