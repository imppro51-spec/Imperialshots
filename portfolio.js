// ---------------- FIREBASE INIT ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ---------------- CONFIG ----------------
const firebaseConfig = {
  apiKey: "AIzaSyAvfmCKZQGxWdNUyqySV5IPk8DiFU4F23U",
  authDomain: "imperialshots-d468c.firebaseapp.com",
  databaseURL: "https://imperialshots-d468c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imperialshots-d468c",
  storageBucket: "imperialshots-d468c.firebasestorage.app",
  messagingSenderId: "819570202874",
  appId: "1:819570202874:web:06f2af78fca0a35f2d5143"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------------- DOM ELEMENTS ----------------
const grid = document.querySelector(".portfolio-grid");
const bookBtn = document.querySelector(".book-btn");
const spinner = document.querySelector(".spinner");
const viewMoreBtn = document.getElementById("viewMoreBtn");
const heroImage = document.getElementById("heroImage");
const heroVideo = document.getElementById("heroVideo");

let mediaItems = [];
let currentFilter = "all";
const ITEMS_PER_PAGE = 6;
let visibleCount = ITEMS_PER_PAGE;

// ---------------- FETCH HERO BANNER ----------------
onValue(ref(db, "heroBanner"), snapshot => {
  const data = snapshot.val();
  if (!data) return;
  if (data.type === "video") {
    heroVideo.src = data.url;
    heroVideo.style.display = "block";
    heroImage.style.display = "none";
  } else {
    heroImage.src = data.url;
    heroImage.style.display = "block";
    heroVideo.style.display = "none";
  }
});

// ---------------- FETCH PORTFOLIO ----------------
const sections = ["wedding","prewedding","reels","ads"];
sections.forEach(section => {
  onValue(ref(db, section), snap => {
    snap.forEach(item => {
      const data = item.val();
      if (!data.active) return;
      const exists = mediaItems.find(m => m.key === item.key && m.section === section);
      if (!exists) mediaItems.push({...data,key:item.key,section});
    });
    displayMedia(currentFilter);
  });
});

// ---------------- FILTER BUTTONS ----------------
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    visibleCount = ITEMS_PER_PAGE;
    currentFilter = btn.dataset.filter;
    displayMedia(currentFilter);
  });
});

// ---------------- DISPLAY MEDIA ----------------
function displayMedia(filter){
  if(spinner) spinner.style.display = "block";

  setTimeout(()=>{
    if(!grid) return;
    grid.innerHTML = "";
    const filtered = filter === "all" ? mediaItems : mediaItems.filter(m => m.section === filter);
    const itemsToShow = filtered.slice(0, visibleCount);

    itemsToShow.forEach(m => {
      const card = document.createElement("div");
      card.className = "item "+m.section;
      card.innerHTML = `
        ${m.type === 'video' ? `<video src="${m.url}" muted loop preload="metadata"></video>` : `<img src="${m.thumb || m.url}">`}
        <span>${m.title || m.section}</span>
        <button class="cta-btn">❤ ${m.likes || 0}</button>
      `;

      // Video hover
      const vid = card.querySelector("video");
      if(vid){
        card.addEventListener("mouseenter",()=>vid.play());
        card.addEventListener("mouseleave",()=>vid.pause());
      }

      // Like button
      card.querySelector(".cta-btn").onclick = async e => {
        e.stopPropagation();
        const userKey = localStorage.getItem("userId") || Date.now().toString();
        localStorage.setItem("userId", userKey);

        if(!m.userLikes) m.userLikes={};
        if(m.userLikes[userKey]) return alert("You already liked!");
        m.userLikes[userKey] = true;

        const newLikes = (m.likes||0) + 1;
        card.querySelector(".cta-btn").textContent = "❤ " + newLikes;
        m.likes = newLikes;

        await update(ref(db, `${m.section}/${m.key}`), {likes:newLikes, userLikes:m.userLikes});
      }

      grid.appendChild(card);
    });

    if(viewMoreBtn) viewMoreBtn.style.display = filtered.length > visibleCount ? "block" : "none";
    if(spinner) spinner.style.display = "none";
  }, 200);
}

// ---------------- VIEW MORE ----------------
if(viewMoreBtn){
  viewMoreBtn.addEventListener("click", ()=>{
    visibleCount += ITEMS_PER_PAGE;
    displayMedia(currentFilter);
  });
}

// ---------------- BOOK BUTTON ----------------
if(bookBtn){
  bookBtn.onclick = ()=> {
    const modal = document.getElementById("quoteModal");
    if(modal) modal.style.display = "flex";
  }
}