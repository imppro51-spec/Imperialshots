import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= FIREBASE CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyAvfmCKZQGxWdNUyqySV5IPk8DiFU4F23U",
  authDomain: "imperialshots-d468c.firebaseapp.com",
  databaseURL: "https://imperialshots-d468c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imperialshots-d468c",
  storageBucket: "imperialshots-d468c.firebasestorage.app",
  messagingSenderId: "819570202874",
  appId: "1:819570202874:web:06f2af78fca0a35f2d5143",
  measurementId: "G-6DQDKML9S5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
/* ================= GET CHECKOUT DATA ================= */

let checkoutData = JSON.parse(sessionStorage.getItem("checkoutData"));

if (!checkoutData) {
  alert("⚠️ No package selected!");
  window.location.href = "packages.html";
}

let originalAmount = Number(checkoutData?.totalAmount) || 0;
let savedAmount = 0;

/* ================= DISPLAY ================= */

function displayCheckout() {

  if (!checkoutData) return;

  coPackage.innerText = checkoutData.packageName || "-";

  // Final amount after coupon
  const finalAmount = Number(checkoutData.totalAmount) || originalAmount;

  coTotal.innerText = finalAmount.toFixed(2);
  coAdvance.innerText = (finalAmount * 0.2).toFixed(2);

  if (savedAmount > 0) {
    couponMessage.innerText =
      "✅ Coupon Applied! You saved ₹" + savedAmount.toFixed(2);
  } else {
    couponMessage.innerText = "";
  }
}

displayCheckout();

/* ================= COUPON ================= */

applyCouponBtn.addEventListener("click", async () => {

  const code = couponInput.value.trim().toUpperCase();
  if (!code) return alert("Enter coupon code");

  try {

    const snap = await get(ref(db, `coupons/${code}`));

    if (!snap.exists()) {
      couponMessage.innerText = "❌ Invalid Coupon";
      return;
    }

    const coupon = snap.val();
    const now = Date.now();

    if (!coupon.active || now < coupon.start || now > coupon.end) {
      couponMessage.innerText = "❌ Coupon Expired";
      return;
    }

    let total = originalAmount;
    savedAmount = 0;

    if (coupon.type === "flat") {
      savedAmount = Number(coupon.value) || 0;
    }

    if (coupon.type === "percent") {
      savedAmount = total * (Number(coupon.value) / 100);
    }

    total -= savedAmount;
    if (total < 0) total = 0;

    checkoutData.totalAmount = parseFloat(total.toFixed(2));
    sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));

    displayCheckout();

  } catch (err) {
    console.error(err);
    alert("Coupon error");
  }
});

/* ================= TERMS CHECKBOX ================= */

function injectCheckbox() {

  if (document.getElementById("payAgreeWrapper")) return;

  const wrapper = document.createElement("div");
  wrapper.id = "payAgreeWrapper";
  wrapper.style = "margin-bottom:12px;";

  wrapper.innerHTML = `
    <label>
      <input type="checkbox" id="payAgree">
      I agree to 
      <a href="terms.html" target="_blank" style="color:blue;">
        Advance, Cancellation & Refund Policy
      </a>
    </label>
  `;

  payBtn.parentNode.insertBefore(wrapper, payBtn);
  payBtn.disabled = true;

  document.getElementById("payAgree").addEventListener("change", (e) => {
    payBtn.disabled = !e.target.checked;
  });
}

injectCheckbox();

/* ================= PAYMENT ================= */

/* ================= PAYMENT ================= */

async function startSecureAdvancePayment() {

  const user = auth.currentUser;
  if (!user) {
    alert("⚠️ Please login first!");
    return;
  }

  if (!checkoutData || !checkoutData.totalAmount) {
    alert("⚠️ Invalid booking data");
    return;
  }

  try {

    const tempBookingId = "TEMP" + Date.now();

    // 1️⃣ Save temporary booking
    await set(ref(db, `tempBookings/${tempBookingId}`), {
      ...checkoutData,
      userId: user.uid,
      status: "pending_payment",
      createdAt: Date.now()
    });

    // 2️⃣ Create Razorpay order
    const response = await fetch(
      "https://imperial-backend1-pb7k.onrender.com/create-order",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: tempBookingId,
          totalAmount: checkoutData.totalAmount,
          paymentType: "advance"
        })
      }
    );

    const result = await response.json();

    if (!result?.order?.id || !result?.key) {
      alert("❌ Order creation failed");
      return;
    }

    const options = {
      key: result.key,
      amount: result.order.amount,
      currency: "INR",
      name: "Imperial Shots",
      description: "Advance Booking Payment",
      order_id: result.order.id,

      handler: async function (paymentResponse) {

        try {

          const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature 
          } = paymentResponse;

          // 3️⃣ Verify Payment (FIXED)
          const verifyRes = await fetch(
            "https://imperial-backend1-pb7k.onrender.com/verify-payment",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                bookingId: tempBookingId,
                paymentType: "advance"
              })
            }
          );

          const verifyData = await verifyRes.json();

          if (!verifyData.success) {
            alert("❌ Payment verification failed");
            return;
          }

          // 4️⃣ Create Final Booking
          const finalBookingId = "IMP" + Date.now();
          const advanceAmount = (checkoutData.totalAmount * 0.2).toFixed(2);

          await set(ref(db, `bookings/${finalBookingId}`), {
            bookingID: finalBookingId,
            userId: user.uid,
            ...checkoutData,
            advanceAmount: advanceAmount,
            status: "advance_paid",
            paidAdvance: true,
            paidMid: false,
            paidFinal: false,
            createdAt: Date.now()
          });

          // 5️⃣ Save Payment History
          await set(ref(db, `paymentHistory/${finalBookingId}/advance`), {
            amount: advanceAmount,
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            razorpaySignature: razorpay_signature,
            paidAt: Date.now()
          });

          // 6️⃣ Delete Temp Booking
          await set(ref(db, `tempBookings/${tempBookingId}`), null);

          sessionStorage.removeItem("checkoutData");

          alert("🎉 Advance Payment Successful!");

          // 7️⃣ Redirect
          window.location.href = "mybookings.html";

        } catch (err) {
          console.error("Verification error:", err);
          alert("Verification error");
        }
      },

      modal: {
        ondismiss: function () {
          console.log("Payment popup closed");
        }
      },

      theme: { color: "#000000" }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error("Payment Failed:", err);
    alert("❌ Payment Failed");
  }
}

/* 🔹 Pay Button */
payBtn.addEventListener("click", () => {

  const checkbox = document.getElementById("payAgree");

  if (!checkbox?.checked) {
    alert("⚠️ Please agree to policy");
    return;
  }

  startSecureAdvancePayment();
});
