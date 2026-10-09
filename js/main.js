(() => {
  "use strict";
  const modal = document.getElementById("bookingModal");
  const form = document.getElementById("bookingForm");
  const feedback = document.getElementById("formFeedback");
  const successPanel = document.getElementById("successPanel");
  const selectedPuja = document.getElementById("selectedPuja");
  const selectedPrice = document.getElementById("selectedPrice");
  const dateInput = document.getElementById("bookingDate");
  const navLinks = document.getElementById("navLinks");
  const menuToggle = document.getElementById("menuToggle");
  let lastFocusedElement = null;
  const hindiDigits = (value) => String(value).replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)]);
  document.getElementById("year").textContent = hindiDigits(new Date().getFullYear());
  const today = new Date();
  dateInput.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");

  function openModal(name, price) {
    lastFocusedElement = document.activeElement;
    selectedPuja.textContent = name || "श्री सत्यनारायण पूजन";
    selectedPrice.textContent = "₹" + hindiDigits(Number(price || 2100).toLocaleString("en-IN"));
    form.hidden = false;
    successPanel.hidden = true;
    feedback.textContent = "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.querySelector(".modal-close").focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocusedElement) lastFocusedElement.focus();
  }
  document.querySelectorAll(".book-trigger").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.puja, button.dataset.price));
  });
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("closeSuccess").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "मेनू बन्द करें" : "मेनू खोलें");
    menuToggle.textContent = isOpen ? "×" : "☰";
  });
  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  }));
  document.getElementById("samagriNotify").addEventListener("click", () => {
    document.getElementById("samagriMessage").textContent = "पूजन-सामग्री का संग्रह अभी उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः देखें।";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback.textContent = "";
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const phone = String(data.get("phone") || "").trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      feedback.textContent = "कृपया भारत का मान्य १० अंकों का मोबाइल क्रमांक लिखें।";
      form.elements.phone.focus();
      return;
    }
    const name = String(data.get("name") || "").trim();
    const location = String(data.get("location") || "").trim();
    if (!name || !location) {
      feedback.textContent = "कृपया अपना नाम और पूजन का स्थान भरें।";
      return;
    }
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "निवेदन भेजा जा रहा है…";
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          date: data.get("date"),
          time: data.get("time"),
          location,
          notes: data.get("notes") || "",
          puja_slug: "satyanarayan"
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "निवेदन नहीं भेजा जा सका। कृपया बाद में प्रयास करें।");
      const booking = result.booking;
      const chosenDate = new Date(String(booking.booking_date).slice(0, 10) + "T00:00:00");
      const dateLabel = chosenDate.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" });
      form.hidden = true;
      successPanel.hidden = false;
      document.getElementById("modalTitle").textContent = "निवेदन प्राप्त हुआ।";
      document.getElementById("successText").textContent =
        name + " जी, " + dateLabel + " को " + booking.puja_name +
        " हेतु आपका निवेदन प्राप्त हो गया है। निवेदन क्रमांक: " + booking.reference +
        "। चुना गया समय: " + booking.time_slot + "। कृपया यह क्रमांक सुरक्षित रखें।";
      successPanel.querySelector(".demo-notice").textContent =
        "यह निवेदन प्राप्त हुआ है, किन्तु पूजन की तिथि अभी निश्चित नहीं है। व्यवस्थापक आपसे सम्पर्क करके पुष्टि करेंगे।";
      successPanel.querySelector("button").focus();
    } catch (error) {
      feedback.textContent = error.message || "निवेदन नहीं भेजा जा सका। कृपया बाद में प्रयास करें।";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'निवेदन भेजें <span>↗</span>';
    }
  });
})();