const { randomUUID } = require("node:crypto");
const { getSql } = require("../lib/db");
function validText(value, max) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "केवल POST अनुरोध स्वीकार है।" }); }
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || !process.env.DATABASE_URL) {
        return res.status(503).json({ error: "ऑनलाइन भुगतान अभी सक्रिय नहीं है। कृपया बाद में प्रयास करें।" });
    }
    const body = req.body || {};
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const pujaDate = typeof body.pujaDate === "string" ? body.pujaDate : "";
    const pujaTime = typeof body.pujaTime === "string" ? body.pujaTime : "";
    const pujaAddress = typeof body.pujaAddress === "string" ? body.pujaAddress.trim() : "";
    const requirements = typeof body.requirements === "string" ? body.requirements.trim() : "";
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(pujaDate) && pujaDate >= today && !Number.isNaN(Date.parse(pujaDate + "T00:00:00Z"));
    const validTime = ["सुबह", "दोपहर", "शाम", "आचार्य जी से तय करेंगे"].includes(pujaTime);
    if (!validText(customerName, 100) || !/^\d{10}$/.test(phone) || !validDate || !validTime ||
        !validText(pujaAddress, 500) || requirements.length > 500) {
        return res.status(400).json({ error: "कृपया सभी जानकारी सही तरीके से भरें।" });
    }
    const bookingId = randomUUID();
    const sql = getSql();
    try {
        await sql`INSERT INTO bookings (id, customer_name, customer_phone, puja_date, puja_time, puja_address, requirements, amount_paise)
            VALUES (${bookingId}, ${customerName}, ${phone}, ${pujaDate}, ${pujaTime}, ${pujaAddress}, ${requirements}, 210000)`;
        const response = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount: 210000, currency: "INR", receipt: bookingId,
                notes: { booking_id: bookingId, puja: "Satyanarayan Katha and Puja" } })
        });
        const order = await response.json().catch(() => ({}));
        if (!response.ok || !order.id) {
            await sql`UPDATE bookings SET status = 'payment_failed', updated_at = NOW() WHERE id = ${bookingId}`;
            console.error("Razorpay order creation failed", response.status, order.error?.code || "unknown");
            return res.status(502).json({ error: "भुगतान शुरू नहीं हो पाया। कृपया फिर प्रयास करें।" });
        }
        await sql`UPDATE bookings SET razorpay_order_id = ${order.id}, updated_at = NOW() WHERE id = ${bookingId}`;
        return res.status(200).json({ bookingId, orderId: order.id, amount: 210000, currency: "INR", keyId, customerName, phone });
    } catch (error) {
        console.error("Create order failed:", error.message);
        return res.status(500).json({ error: "बुकिंग शुरू नहीं हो पाई। कृपया कुछ देर बाद प्रयास करें।" });
    }
};
