// आचार्य जी का WhatsApp नंबर देश कोड सहित यहाँ डालें, जैसे: 91XXXXXXXXXX
// जब तक सही नंबर नहीं जोड़ा जाता, फॉर्म WhatsApp संदेश नहीं भेजेगा.
const WHATSAPP_NUMBER = "";

const bookingForm = document.getElementById("bookingForm");
const bookingMessage = document.getElementById("bookingMessage");
const pujaDate = document.getElementById("pujaDate");

// आज से पहले की तारीख चुनने से रोकें.
if (pujaDate) {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

    pujaDate.min = localToday;
}

if (bookingForm) {
    bookingForm.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!bookingForm.reportValidity()) {
            return;
        }

        const formData = new FormData(bookingForm);
        const customerName = String(formData.get("customerName")).trim();
        const phone = String(formData.get("phone")).trim();
        const date = String(formData.get("pujaDate"));
        const time = String(formData.get("pujaTime"));
        const address = String(formData.get("pujaAddress")).trim();
        const requirements = String(formData.get("requirements") || "").trim();

        const message = [
            "॥ पूजनम् — श्री सत्यनारायण कथा एवं पूजा बुकिंग अनुरोध ॥",
            "",
            "नाम: " + customerName,
            "मोबाइल: " + phone,
            "पूजा की तारीख: " + date,
            "पसंदीदा समय: " + time,
            "पूजा का पता: " + address,
            "पूजा शुल्क: ₹2,100",
            requirements ? "अन्य जानकारी: " + requirements : ""
        ].filter(Boolean).join("\n");

        if (!/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
            bookingMessage.textContent =
                "फॉर्म सही है। बुकिंग भेजने की सुविधा चालू करने के लिए वेबसाइट में आचार्य जी का WhatsApp नंबर जोड़ना बाकी है। अभी अनुरोध भेजा नहीं गया है।";
            bookingMessage.classList.add("is-warning");
            return;
        }

        const whatsappUrl =
            "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        bookingMessage.textContent =
            "आपका बुकिंग संदेश तैयार है। WhatsApp में संदेश देखकर भेजें। बुकिंग की पुष्टि आचार्य जी के जवाब के बाद होगी।";
        bookingMessage.classList.remove("is-warning");
    });
}