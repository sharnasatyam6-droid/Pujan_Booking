function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
}
async function sendTemplateMessage(to, templateName, parameters) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_API_VERSION;
    const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "hi";
    if (!token || !phoneNumberId || !version || !templateName) {
        throw new Error("WhatsApp Cloud API or approved template configuration is incomplete");
    }
    const response = await fetch("https://graph.facebook.com/" + version + "/" + phoneNumberId + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
                name: templateName,
                language: { code: language },
                components: [{ type: "body", parameters: parameters.map((value) => ({
                    type: "text", text: String(value || "-").slice(0, 1000)
                })) }]
            }
        })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("WhatsApp API error " + response.status + ": " + JSON.stringify(payload).slice(0, 800));
    return payload;
}
async function notifyBooking(booking) {
    const customerRaw = digitsOnly(booking.customer_phone);
    const customerTo = customerRaw.length === 10 ? "91" + customerRaw : customerRaw;
    const dadTo = digitsOnly(process.env.DAD_WHATSAPP_NUMBER);
    if (!/^91\d{10}$/.test(customerTo)) throw new Error("Customer number is not a valid Indian mobile number");
    if (!/^91\d{10}$/.test(dadTo)) throw new Error("DAD_WHATSAPP_NUMBER must contain country code 91 and 10 digits");
    const date = String(booking.puja_date).slice(0, 10);
    const amount = "₹2,100";
    const reference = String(booking.id);
    const results = await Promise.allSettled([
        sendTemplateMessage(customerTo, process.env.WHATSAPP_CUSTOMER_TEMPLATE, [
            booking.customer_name, date, booking.puja_time, booking.puja_address, amount, reference
        ]),
        sendTemplateMessage(dadTo, process.env.WHATSAPP_ADMIN_TEMPLATE, [
            booking.customer_name, booking.customer_phone, date, booking.puja_time,
            booking.puja_address, amount, reference
        ])
    ]);
    const errors = results.map((r, i) => r.status === "rejected"
        ? (i === 0 ? "customer: " : "admin: ") + r.reason.message : null).filter(Boolean);
    if (errors.length) throw new Error(errors.join(" | "));
}
module.exports = { notifyBooking };
