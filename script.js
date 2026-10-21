// Razorpay keys and secrets must stay on the server. The public key is returned by /api/create-order.
const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");
const pujaDate = document.getElementById("pujaDate");
const submitButton = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;

if (pujaDate) {
    const now = new Date();
    pujaDate.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
}

function showMessage(message, warning = false) {
    if (!bookingMessage) return;
    bookingMessage.textContent = message;
    bookingMessage.classList.toggle("is-warning", warning);
}

async function readJson(response) {
    return response.json().catch(() => ({}));
}

if (bookingForm) {
    bookingForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!bookingForm.reportValidity()) return;

        if (!window.Razorpay) {
            showMessage("भुगतान सुविधा लोड नहीं हो पाई। कृपया इंटरनेट जाँचकर फिर प्रयास करें।", true);
            return;
        }

        const formData = new FormData(bookingForm);
        const booking = {
            customerName: String(formData.get("customerName") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
            pujaDate: String(formData.get("pujaDate") || ""),
            pujaTime: String(formData.get("pujaTime") || ""),
            pujaAddress: String(formData.get("pujaAddress") || "").trim(),
            requirements: String(formData.get("requirements") || "").trim()
        };

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "भुगतान सुविधा तैयार हो रही है…";
        }
        showMessage("बुकिंग विवरण सुरक्षित रूप से भेजे जा रहे हैं…");

        try {
            const response = await fetch("/api/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(booking)
            });
            const order = await readJson(response);
            if (!response.ok) throw new Error(order.error || "ऑनलाइन भुगतान अभी उपलब्ध नहीं है।");

            const checkout = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "पूजनम्",
                description: "श्री सत्यनारायण कथा एवं पूजा",
                order_id: order.orderId,
                prefill: { name: order.customerName, contact: order.phone },
                notes: { booking_id: order.bookingId },
                theme: { color: "#d8b16b" },
                modal: {
                    ondismiss: function () {
                        showMessage("भुगतान विंडो बंद हुई। यदि आपने भुगतान कर दिया है, तो दोबारा भुगतान न करें; पुष्टि की जाँच की जाएगी।", true);
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = "विवरण भरकर भुगतान करें ↗";
                        }
                    }
                },
                handler: async function (payment) {
                    showMessage("भुगतान की पुष्टि की जा रही है। कृपया पृष्ठ बंद न करें…");
                    try {
                        const verifyResponse = await fetch("/api/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payment)
                        });
                        const result = await readJson(verifyResponse);
                        if (!verifyResponse.ok || !result.success) {
                            showMessage("भुगतान हो सकता है पूरा हो गया हो, लेकिन पुष्टि अभी नहीं मिली। कृपया दोबारा भुगतान न करें; सहायता से संपर्क करें।", true);
                            return;
                        }
                        showMessage("भुगतान सत्यापित हो गया। आपका बुकिंग संदर्भ क्रमांक: " + result.bookingId +
                            "। WhatsApp संदेश भेजने की प्रक्रिया शुरू की गई है। पूजा की अंतिम पुष्टि आचार्य जी से होगी।");
                        bookingForm.reset();
                        if (pujaDate) {
                            const now = new Date();
                            pujaDate.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                                .toISOString().slice(0, 10);
                        }
                    } catch (error) {
                        showMessage("भुगतान का परिणाम जाँचा नहीं जा सका। कृपया दोबारा भुगतान न करें; सहायता से संपर्क करें।", true);
                    } finally {
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = "विवरण भरकर भुगतान करें ↗";
                        }
                    }
                }
            });

            checkout.on("payment.failed", function () {
                showMessage("भुगतान सफल नहीं हुआ। कृपया भुगतान विवरण जाँचकर फिर प्रयास करें।", true);
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "विवरण भरकर भुगतान करें ↗";
                }
            });
            checkout.open();
        } catch (error) {
            showMessage(error.message || "अभी भुगतान शुरू नहीं हो पाया। कृपया बाद में प्रयास करें।", true);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "विवरण भरकर भुगतान करें ↗";
            }
        }
    });
}
