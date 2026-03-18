import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  update
} from
"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ===== LOGIN CHECK ===== */
const vendorLoginId = localStorage.getItem("vendorLoginId");

if (!vendorLoginId) {
  window.location.href = "vendor-login.html";
}

/* ===== FIREBASE CONFIG ===== */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "vendors-d084b.firebaseapp.com",
  databaseURL: "https://vendors-d084b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vendors-d084b",
  storageBucket: "vendors-d084b.firebasestorage.app",
  messagingSenderId: "58526160322",
  appId: "1:58526160322:web:dbd489764ebfc5e2eff25b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const profileCard = document.getElementById("profileCard");

let currentVendorKey = null;

/* ================= LOAD PROFILE ================= */
async function loadProfile() {

  const approvedSnap = await get(ref(db, "vendors/approved"));

  if (!approvedSnap.exists()) {
    profileCard.innerHTML = "Profile not found.";
    return;
  }

  let vendorData = null;

  approvedSnap.forEach(child => {
    const v = child.val();
    if (v.vendorLoginId === vendorLoginId) {
      vendorData = v;
      currentVendorKey = child.key;
    }
  });

  if (!vendorData) {
    profileCard.innerHTML = "Profile not found.";
    return;
  }

  /* ===== GET CREDENTIALS ===== */
  const credSnap = await get(ref(db, "vendorCredentials/" + vendorLoginId));

  let loginId = "-";
  let password = "-";

  if (credSnap.exists()) {
    const cred = credSnap.val();
    loginId = cred.loginId;
    password = cred.password;
  }

  /* ===== UI ===== */
  profileCard.innerHTML = `

    <button id="editBtn">Edit</button>
    <button id="saveBtn" style="display:none;">Save</button>

    <div class="section">
      <h3>Login Details</h3>
      <div class="info">
        <div>Login ID: <input id="loginId" value="${loginId}" disabled></div>
        <div>Password: <input id="password" value="${password}" disabled></div>
      </div>
    </div>

    <div class="section">
      <h3>Basic Information</h3>
      <div class="info">
        <div>Name: <input id="name" value="${vendorData.name || ""}" disabled></div>
        <div>Phone: <input id="phone" value="${vendorData.phone || ""}" disabled></div>
        <div>Email: <input id="email" value="${vendorData.email || ""}" disabled></div>
        <div>DOB: <input id="dob" value="${vendorData.dob || ""}" disabled></div>
        <div>City: <input id="city" value="${vendorData.city || ""}" disabled></div>
      </div>
    </div>

    <div class="section">
      <h3>Studio Info</h3>
      <div class="info">
        <div>Camera: <input id="camera" value="${vendorData.assets?.camera || ""}" disabled></div>
        <div>Drone: <input id="drone" value="${vendorData.assets?.drone || ""}" disabled></div>
        <div>Lights: <input id="lights" value="${vendorData.assets?.lights || ""}" disabled></div>
        <div>Software: <input id="software" value="${vendorData.assets?.software || ""}" disabled></div>
        <div>Portfolio: <input id="portfolio" value="${vendorData.assets?.portfolio || ""}" disabled></div>
      </div>
    </div>

    <div class="section">
      <h3>Identity</h3>
      <div class="info">
        <div>Aadhaar: <input id="aadhaar" value="${vendorData.identity?.aadhaar || ""}" disabled></div>
        <div>PAN: <input id="pan" value="${vendorData.identity?.pan || ""}" disabled></div>
      </div>
    </div>
  `;

  addEventListeners();
}

/* ================= EDIT BUTTON ================= */
function addEventListeners() {

  document.getElementById("editBtn").addEventListener("click", () => {

    document.querySelectorAll("#profileCard input").forEach(input => {
      input.disabled = false;
    });

    document.getElementById("editBtn").style.display = "none";
    document.getElementById("saveBtn").style.display = "inline-block";
  });

  /* ================= SAVE BUTTON ================= */
  document.getElementById("saveBtn").addEventListener("click", async () => {

    const updatedData = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      dob: document.getElementById("dob").value,
      city: document.getElementById("city").value,
      assets: {
        camera: document.getElementById("camera").value,
        drone: document.getElementById("drone").value,
        lights: document.getElementById("lights").value,
        software: document.getElementById("software").value,
        portfolio: document.getElementById("portfolio").value
      },
      identity: {
        aadhaar: document.getElementById("aadhaar").value,
        pan: document.getElementById("pan").value
      }
    };

    const updatedCred = {
      loginId: document.getElementById("loginId").value,
      password: document.getElementById("password").value
    };

    try {

      /* ===== UPDATE PROFILE ===== */
      await update(ref(db, "vendors/approved/" + currentVendorKey), updatedData);

      /* ===== UPDATE CREDENTIALS ===== */
      await update(ref(db, "vendorCredentials/" + vendorLoginId), updatedCred);

      alert("Profile Updated Successfully ✅");

      location.reload();

    } catch (err) {
      console.error(err);
      alert("Update Failed ❌");
    }

  });
}

loadProfile();