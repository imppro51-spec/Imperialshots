/**************** FIREBASE INIT ****************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

/**************** REUSABLE FORM FUNCTION ****************/
function saveForm(formId, dbNode){
  const form = document.getElementById(formId);
  if(!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {};
    [...form.elements].forEach(el => {
      if(el.name) data[el.name] = el.value; // HTML me input ko name attribute dena zaruri
    });
    data.createdAt = new Date().toISOString();

    push(ref(db, dbNode), data)
      .then(() => {
        alert("Form submitted successfully!");
        form.reset();
      })
      .catch(err => alert("Error: " + err.message));
  });
}

/**************** CONNECT FORMS ****************/
saveForm("quoteForm", "quotes");
saveForm("contactForm", "contacts"); // Get in Touch
saveForm("weddingBookingForm", "weddingBookings");
saveForm("preWeddingForm", "preWeddingBookings");

/**************** LIVE BANNERS ****************/
const banners = [
  { id: "heroSection", path: "website/banners/home" },
  { id: "portfolioHero", path: "website/banners/portfolio" },
  { id: "weddingHero", path: "website/banners/wedding" },
  { id: "preweddingHero", path: "website/banners/prewedding" },
];

banners.forEach(b => {
  const el = document.getElementById(b.id);
  if(!el) return;

  onValue(ref(db, b.path), snapshot => {
    const url = snapshot.val();
    if(url){
      el.style.background = `url('${url}') center center / cover no-repeat`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    }
  });
});

/**************** CONNECT FORMS ****************/
// HTML me form ka ID aur Firebase node name same karo
saveForm("quoteForm", "quotes");
saveForm("contactForm", "contacts");
saveForm("weddingBookingForm", "weddingBookings");
saveForm("preWeddingForm", "preWeddingBookings");



