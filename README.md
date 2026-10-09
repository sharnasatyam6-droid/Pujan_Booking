# Veda Pujan — Pujan Booking

A responsive, frontend-only prototype for booking traditional pujan services and, later, purchasing puja samagri.

## Current prototype

- Editorial dark-indigo and antique-gold design with a sacred diya / mandala visual.
- Responsive navigation and mobile layout.
- One service: **Satyanarayan Pujan — ₹2,100**.
- Booking-request modal with name, Indian mobile number, preferred date, time, location, and optional notes.
- Basic client-side validation and a demo confirmation state.
- Samagri-shop preview section for a future storefront.
- No frameworks, build step, database, payment collection, or backend.

**Important:** this is a visual/frontend prototype. Submitting the form does not send a request to the pujari, save details, or confirm availability. Do not treat the demo form as a live booking system.

## Project structure

```text
Pujan_Booking/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── backend/
│   └── README.md
├── vercel.json
└── README.md
```

## Run locally

Open `index.html` in a browser, or use the VS Code **Live Server** extension. No package installation is needed.

## Deploy on Vercel

1. Import `sharnasatyam6-droid/Pujan_Booking` into Vercel.
2. Choose **Other** as the framework preset (or leave framework detection disabled).
3. Leave the build command empty.
4. Set the output directory to `.` (project root).
5. Deploy.

The included `vercel.json` makes the static site configuration explicit.

## Planned next phase

Build the backend separately and connect the booking form to a real endpoint. Before accepting real bookings, add secure validation, spam protection, persistent storage, a way for the pujari to receive/manage requests, and a clear privacy notice. Later, add a puja samagri catalogue, inventory, order handling, and a payment provider if required.

## Branding

“Veda” is a temporary visual brand for this prototype and can be renamed to the family's preferred business name before launch.
