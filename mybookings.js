/* ================= FIREBASE ================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  get,
  update
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyAvfmCKZQGxWdNUyqySV5IPk8DiFU4F23U",
  authDomain: "imperialshots-d468c.firebaseapp.com",
  databaseURL:
    "https://imperialshots-d468c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imperialshots-d468c"
};

/* ================= INIT ================= */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

/* ================= DOM ================= */

const bookingsContainer = document.getElementById("bookingsContainer");
const tabs = document.querySelectorAll(".tab");
const backBtn = document.getElementById("backBtn");

/* ================= STATE ================= */

let currentUserId = null;
let allBookings = {};
let activeStatus = "pending";

/* ================= BACK ================= */

backBtn.addEventListener("click", () => history.back());

/* ================= AUTH ================= */

onAuthStateChanged(auth, user => {

  if (!user) {
    bookingsContainer.innerHTML =
      "<p>Please login to see bookings</p>";
    return;
  }

  currentUserId = user.uid;

  onValue(ref(db, "bookings"), snap => {

    const data = snap.val() || {};

    allBookings = Object.fromEntries(
      Object.entries(data).filter(
        ([k, b]) => b.userId === currentUserId
      )
    );

    renderBookings();
  });

});

/* ================= TABS ================= */

tabs.forEach(tab => {

  tab.addEventListener("click", () => {

    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    activeStatus = tab.dataset.status;
    renderBookings();
  });

});

/* ================= RENDER ================= */

function renderBookings() {

  bookingsContainer.innerHTML = "";

  const filtered = Object.entries(allBookings).filter(([key, b]) => {

    if (activeStatus === "pending")
      return ["advance_paid", "mid_paid"].includes(b.status);

    if (activeStatus === "completed")
      return b.status === "completed";

    if (activeStatus === "canceled")
      return b.status === "canceled";

    return true;
  });

  if (!filtered.length) {
    bookingsContainer.innerHTML =
      "<p>No bookings found</p>";
    return;
  }

  filtered.forEach(([bookingKey, booking]) => {

    const card = document.createElement("div");
    card.className = "booking-card";

    card.innerHTML = `
      <h3>${booking.packageName}</h3>
      <p><b>Booking ID:</b> ${booking.bookingID}</p>
      <p><b>Total:</b> ₹${booking.totalAmount}</p>
      <p><b>Status:</b> ${booking.status}</p>

      <div class="payment-section">

        <button disabled>
          Advance Paid
        </button>

        <button class="mid-btn" ${booking.paidMid ? "disabled" : ""}>
          ${booking.paidMid ? "Mid Paid" : "Pay Mid"}
        </button>

        <button class="final-btn" ${booking.paidFinal ? "disabled" : ""}>
          ${booking.paidFinal ? "Final Paid" : "Pay Final"}
        </button>

        ${booking.paidFinal
          ? `<button class="invoice-btn">Download Invoice</button>`
          : ""}

      </div>
    `;

    bookingsContainer.appendChild(card);

    card.querySelector(".mid-btn")
      ?.addEventListener("click", () =>
        startSecurePayment(bookingKey, "mid")
      );

    card.querySelector(".final-btn")
      ?.addEventListener("click", () =>
        startSecurePayment(bookingKey, "final")
      );

    card.querySelector(".invoice-btn")
      ?.addEventListener("click", () =>
        generateInvoice(booking)
      );
  });
}

/* ================= SECURE PAYMENT ================= */

async function startSecurePayment(bookingId, paymentType) {

  try {

    const bookingSnap = await get(ref(db, `bookings/${bookingId}`));

    if (!bookingSnap.exists()) {
      alert("Booking not found");
      return;
    }

    const booking = bookingSnap.val();

    const total = Number(booking.totalAmount || 0);
    const discount = Number(booking.discount || 0);
    const netTotal = total - discount;

    let percentage = paymentType === "mid" ? 0.30 : 0.50;
    let expectedAmount = Math.round(netTotal * percentage);

    console.log("Expected Payment:", expectedAmount);

    /* ================= CREATE ORDER ================= */

    const response = await fetch(
      "https://imperial-backend1.onrender.com/create-order",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          totalAmount: total,
          discount: discount,
          paymentType
        })
      }
    );

    if (!response.ok) {
      throw new Error("Order creation failed");
    }

    const result = await response.json();

    if (!result.order || !result.key) {
      alert("Order creation failed");
      return;
    }

    /* ================= RAZORPAY ================= */

    const options = {
      key: result.key,
      order_id: result.order.id,
      currency: "INR",

      handler: async function (response) {

        try {

          const verifyRes = await fetch(
            "https://imperial-backend1.onrender.com/verify-payment",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                bookingId,
                paymentType
              })
            }
          );

          if (!verifyRes.ok) {
            throw new Error("Verification API failed");
          }

          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            alert("Payment verification failed ❌");
            return;
          }

          alert("Payment Successful ✅");
          location.reload();

        } catch (err) {
          console.error("Verification error:", err);
          alert("Payment verification failed ❌");
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error("Payment error:", err);
    alert("Payment failed ❌");
  }
}

/* ================= INVOICE ================= */

function generateInvoice(booking) {

  const win = window.open("", "_blank");

  const total = Number(booking.totalAmount || 0);
  const discount = Number(booking.discount || 0);
  const netTotal = total - discount;

  const paymentDate = booking.finalPaidDate
    ? new Date(booking.finalPaidDate).toLocaleDateString()
    : new Date().toLocaleDateString();

  const invoiceNumber =
    "IMP001" + (booking.bookingID?.slice(-5) || "00001");

  win.document.write(`
    <html>
    <head>
      <title>Invoice</title>
      <style>
        body { font-family: Arial; padding: 40px; }
      </style>
    </head>
    <body>

      <h1>INVOICE</h1>
      <p>Booking ID: ${booking.bookingID}</p>
      <p>Invoice No: ${invoiceNumber}</p>
      <p>Date: ${paymentDate}</p>

      <hr>

      <p><b>Billed To:</b> ${booking.clientName}</p>
      <p><b>Package:</b> ${booking.packageName}</p>
      <p><b>Total:</b> ₹${total}</p>
      <p><b>Discount:</b> ₹${discount}</p>
      <p><b>Final Amount:</b> ₹${netTotal}</p>

      <p>Thank you for choosing Imperial Shots</p>

    </body>
    </html>
  `);

  win.document.close();
  win.print();
}
