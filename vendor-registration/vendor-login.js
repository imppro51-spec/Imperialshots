// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyDmmcRlCs6K0PzxnFkuA0qv5U5K3V6x8QQ",
  authDomain: "vendors-d084b.firebaseapp.com",
  databaseURL: "https://vendors-d084b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vendors-d084b",
  storageBucket: "vendors-d084b.firebasestorage.app",
  messagingSenderId: "58526160322",
  appId: "1:58526160322:web:dbd489764ebfc5e2eff25b",
  measurementId: "G-6MHKLQR9S7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ================= LOGIN FUNCTION =================
function vendorLogin() {

  console.log("Login clicked");

  const loginId = document.getElementById("loginId").value.trim().toLowerCase();
  const password = document.getElementById("password").value.trim();
  const messageBox = document.getElementById("loginMessage");

  if (!messageBox) {
    alert("loginMessage element missing ❌");
    return;
  }

  if (!loginId || !password) {
    messageBox.style.color = "red";
    messageBox.innerHTML = "Please enter Login ID and Password";
    return;
  }

  db.ref("vendorCredentials").once("value")
    .then(snapshot => {

      let found = false;

      snapshot.forEach(child => {

        if (child.key.toLowerCase() === loginId) {

          const data = child.val();

          if (data.password === password) {

            found = true;

            messageBox.style.color = "#22c55e";
            messageBox.innerHTML = "Login Successful!";

            localStorage.setItem("vendorLoginId", child.key);
            localStorage.setItem("vendorName", data.name);

            setTimeout(() => {
              window.location.href = "vendor-dashboard.html";
            }, 1000);
          }

        }

      });

      if (!found) {
        messageBox.style.color = "red";
        messageBox.innerHTML = "Invalid Login ID or Password";
      }

    })
    .catch(error => {
      console.log(error);
      messageBox.innerHTML = "Error: " + error.message;
    });
}
