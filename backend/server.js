const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

/* ================= CORS FIX ================= */

const corsOptions = {
  origin: [
    "http://127.0.0.1:5501",
    "http://localhost:5500",
    "http://localhost:5501"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());

/* ================= FIREBASE ADMIN ================= */

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://imperialshots-d468c-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

/* ================= RAZORPAY ================= */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Razorpay ENV variables missing!");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("🚀 Imperial Backend Running Securely");
});

/* ================= CREATE ORDER ================= */

app.post("/create-order", async (req, res) => {
  try {
    console.log("📥 BODY RECEIVED:", req.body);

    const { bookingId, paymentType } = req.body;

    if (!bookingId || !paymentType) {
      return res.status(400).json({ error: "Missing bookingId or paymentType" });
    }

    let amount = 0;
    let booking;

    if (paymentType === "advance") {
      const snap = await db.ref("tempBookings/" + bookingId).once("value");
      booking = snap.val();

      if (!booking) {
        return res.status(404).json({ error: "Temp booking not found" });
      }

      const total = Number(booking.totalAmount || 0);
      amount = Math.round(total * 0.2);
    } else {
      const snap = await db.ref("bookings/" + bookingId).once("value");
      booking = snap.val();

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const total = Number(booking.totalAmount || 0);
      const discount = Number(booking.discount || 0);
      const netTotal = total - discount;

      if (paymentType === "mid") {
        amount = Math.round(netTotal * 0.3);
      }

      if (paymentType === "final") {
        amount = Math.round(netTotal * 0.5);
      }
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Invalid amount calculation" });
    }

    console.log("💰 FINAL AMOUNT:", amount);

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: bookingId,
    });

    console.log("✅ ORDER CREATED:", order.id);

    res.json({
      order,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= VERIFY PAYMENT ================= */

app.post("/verify-payment", async (req, res) => {
  try {
    console.log("📥 VERIFY BODY:", req.body);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      paymentType,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    if (paymentType === "advance") {
      const tempSnap = await db.ref("tempBookings/" + bookingId).once("value");
      const tempData = tempSnap.val();

      if (!tempData) {
        return res.status(404).json({ error: "Temp booking not found" });
      }

      const finalBookingId = "IMP" + Date.now();

      const bookingObject = {
        ...tempData,
        bookingID: finalBookingId,
        paidAdvance: true,
        status: "advance_paid",
        razorpay_payment_id,
      };

      await db.ref("bookings/" + finalBookingId).set(bookingObject);
      await db.ref("tempBookings/" + bookingId).remove();

      return res.json({ success: true });
    }

    const updates = { razorpay_payment_id };

    if (paymentType === "mid") {
      updates.paidMid = true;
      updates.status = "mid_paid";
    }

    if (paymentType === "final") {
      updates.paidFinal = true;
      updates.status = "completed";
    }

    await db.ref("bookings/" + bookingId).update(updates);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
