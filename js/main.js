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

  document.getElementById("year").textContent = new Date().getFullYear();
  const today = new Date();
  dateInput.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");

  function openModal(name, price) {
    lastFocusedElement = document.activeElement;
    selectedPuja.textContent = name || "Satyanarayan Pujan";
    selectedPrice.textContent = "₹" + Number(price || 2100).toLocaleString("en-IN");
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
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    menuToggle.textContent = isOpen ? "×" : "☰";
  });
  navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  }));

  document.getElementById("samagriNotify").addEventListener("click", () => {
    document.getElementById("samagriMessage").textContent = "The samagri shop is not open yet. Please check back soon.";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const phone = String(data.get("phone") || "").trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      feedback.textContent = "Please enter a valid 10-digit Indian mobile number.";
      form.elements.phone.focus();
      return;
    }
    const chosenDate = new Date(data.get("date") + "T00:00:00");
    const dateLabel = chosenDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const name = String(data.get("name")).trim();
    const location = String(data.get("location")).trim();
    if (!name || !location) {
      feedback.textContent = "Please complete your name and pujan location.";
      return;
    }
    form.hidden = true;
    successPanel.hidden = false;
    document.getElementById("successText").textContent =
      "Your demo request for " + selectedPuja.textContent + " on " + dateLabel +
      " has been prepared. The preferred time is “" + data.get("time") +
      "”. No information has been sent or stored. Please contact the pujari directly to arrange and confirm the booking.";
    successPanel.querySelector("button").focus();
  });

  // Frontend-only prototype: no database, external messaging, or real reservation is connected.
})();