(() => {
  "use strict";
  const loginView = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const dashboardMessage = document.getElementById("dashboardMessage");
  const bookingList = document.getElementById("bookingList");
  const statusFilter = document.getElementById("statusFilter");
  const hindiDigits = (value) => String(value ?? "").replace(/\d/g, digit => "०१२३४५६७८९"[Number(digit)]);
  const statusNames = { pending: "पुष्टि की प्रतीक्षा", confirmed: "पुष्टि की गई", completed: "पूजन सम्पन्न", cancelled: "रद्द" };
  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || "अनुरोध पूरा नहीं हो सका।");
    return data;
  }
  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadDashboard();
  }
  async function checkSession() {
    try { await request("/api/admin/me"); showDashboard(); }
    catch { loginView.hidden = false; dashboardView.hidden = true; }
  }
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginMessage.textContent = "प्रवेश जाँचा जा रहा है…";
    const button = loginForm.querySelector("button");
    button.disabled = true;
    try {
      const values = new FormData(loginForm);
      await request("/api/admin/login", { method: "POST", body: JSON.stringify({ username: values.get("username"), password: values.get("password") }) });
      loginForm.reset();
      showDashboard();
    } catch (error) { loginMessage.textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.getElementById("logoutButton").addEventListener("click", async () => {
    try { await request("/api/admin/logout", { method: "POST", body: "{}" }); } catch {}
    dashboardView.hidden = true;
    loginView.hidden = false;
    loginMessage.textContent = "आप बाहर आ गए हैं।";
  });
  document.getElementById("refreshButton").addEventListener("click", loadDashboard);
  statusFilter.addEventListener("change", loadBookings);
  async function loadDashboard() {
    dashboardMessage.textContent = "निवेदन और आँकड़े प्राप्त हो रहे हैं…";
    try {
      const data = await request("/api/admin/stats");
      const stats = data.stats;
      document.getElementById("statTotal").textContent = hindiDigits(stats.total);
      document.getElementById("statPending").textContent = hindiDigits(stats.pending);
      document.getElementById("statConfirmed").textContent = hindiDigits(stats.confirmed);
      document.getElementById("statCompleted").textContent = hindiDigits(stats.completed);
      await loadBookings();
      dashboardMessage.textContent = "";
    } catch (error) {
      dashboardMessage.textContent = error.message;
      if (/प्रवेश की अवधि/.test(error.message)) checkSession();
    }
  }
  async function loadBookings() {
    bookingList.replaceChildren();
    const waiting = document.createElement("div");
    waiting.className = "empty-state";
    waiting.textContent = "निवेदन सूची प्राप्त हो रही है…";
    bookingList.append(waiting);
    try {
      const filter = statusFilter.value;
      const data = await request("/api/admin/bookings" + (filter ? "?status=" + encodeURIComponent(filter) : ""));
      bookingList.replaceChildren();
      if (!data.bookings.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "अभी इस सूची में कोई निवेदन नहीं है।";
        bookingList.append(empty);
        return;
      }
      data.bookings.forEach((booking) => bookingList.append(makeBookingCard(booking)));
    } catch (error) {
      bookingList.replaceChildren();
      const failed = document.createElement("div");
      failed.className = "empty-state";
      failed.textContent = error.message;
      bookingList.append(failed);
    }
  }
  function makeBookingCard(booking) {
    const card = document.createElement("article");
    card.className = "booking-card";
    const info = document.createElement("div");
    const top = document.createElement("div");
    top.className = "booking-top";
    const ref = document.createElement("span");
    ref.className = "booking-ref";
    ref.textContent = booking.reference;
    const pill = document.createElement("span");
    pill.className = "status-pill";
    pill.textContent = statusNames[booking.status] || booking.status;
    top.append(ref, pill);
    const name = document.createElement("h3");
    name.textContent = booking.customer_name;
    info.append(top, name);
    const details = [
      ["दूरभाष", booking.phone],
      ["पूजन", booking.puja_name],
      ["शुल्क", "₹" + hindiDigits(Number(booking.price).toLocaleString("en-IN"))],
      ["तिथि", new Date(String(booking.booking_date).slice(0,10) + "T00:00:00").toLocaleDateString("hi-IN", { day:"numeric", month:"long", year:"numeric" })],
      ["समय", booking.time_slot],
      ["स्थान", booking.location],
      ["विशेष जानकारी", booking.notes || "नहीं दी गई"]
    ];
    details.forEach(([label, value]) => {
      const p = document.createElement("p");
      p.className = "booking-detail";
      const strong = document.createElement("strong");
      strong.textContent = label + " : ";
      p.append(strong, document.createTextNode(value));
      info.append(p);
    });
    const actions = document.createElement("form");
    actions.className = "booking-actions";
    const statusLabel = document.createElement("label");
    statusLabel.textContent = "निवेदन की स्थिति";
    const select = document.createElement("select");
    select.name = "status";
    Object.entries(statusNames).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = booking.status === value;
      select.append(option);
    });
    statusLabel.append(select);
    const noteLabel = document.createElement("label");
    noteLabel.textContent = "व्यवस्थापक की निजी टिप्पणी";
    const note = document.createElement("textarea");
    note.name = "admin_note";
    note.maxLength = 700;
    note.placeholder = "सम्पर्क अथवा व्यवस्था से जुड़ी टिप्पणी";
    note.value = booking.admin_note || "";
    noteLabel.append(note);
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "परिवर्तन सुरक्षित करें";
    actions.append(statusLabel, noteLabel, save);
    actions.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      save.textContent = "सुरक्षित हो रहा है…";
      try {
        await request("/api/admin/bookings", { method: "PATCH", body: JSON.stringify({ id: booking.id, status: select.value, admin_note: note.value }) });
        dashboardMessage.textContent = "निवेदन " + booking.reference + " की स्थिति सुरक्षित कर दी गई है।";
        await loadDashboard();
      } catch (error) {
        dashboardMessage.textContent = error.message;
        save.disabled = false;
        save.textContent = "परिवर्तन सुरक्षित करें";
      }
    });
    card.append(info, actions);
    return card;
  }
  checkSession();
})();