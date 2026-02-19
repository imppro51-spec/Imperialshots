import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ---------------- FIREBASE CONFIG ----------------
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

// ---------------- ELEMENTS ----------------
const grid = document.querySelector(".portfolio-grid");
const bookBtn = document.querySelector(".book-btn"); // your "Book Your Shoot" button
let mediaItems = [];
let currentFilter = "all";
const ITEMS_PER_PAGE = 6;
let visibleCount = ITEMS_PER_PAGE;

// ---------------- SPINNER ----------------
const spinner = document.createElement("div");
spinner.className = "spinner";
spinner.innerHTML = `<div class="lds-ring"><div></div><div></div><div></div><div></div></div>`;
grid.parentNode.insertBefore(spinner, grid);

// ---------------- VIEW MORE ----------------
const viewMoreBtn = document.createElement("button");
viewMoreBtn.id = "viewMoreBtn";
viewMoreBtn.textContent = "View More";
viewMoreBtn.style.display = "none";
viewMoreBtn.addEventListener("click", () => {
  visibleCount += ITEMS_PER_PAGE;
  displayMedia(currentFilter);
});
grid.after(viewMoreBtn);

// ---------------- PREVIEW MODAL ----------------
const modal = document.createElement("div");
modal.className = "modal";
modal.innerHTML = `
  <div class="modal-box">
    <span class="close">&times;</span>
    <div class="preview-content"></div>
    <h3 class="preview-title"></h3>
    <p class="preview-desc"></p>
    <div class="preview-likes">
      <button class="like-btn">❤ <span class="like-count">0</span></button>
    </div>
  </div>
`;
document.body.appendChild(modal);
modal.querySelector(".close").onclick = () => modal.style.display = "none";

// ---------------- FETCH MEDIA ----------------
const sections = ["wedding","prewedding","reels","ads"];
sections.forEach(section => {
  onValue(ref(db, section), snap => {
    snap.forEach(item => {
      const data = item.val();
      if (!data.active) return;
      const exists = mediaItems.find(m => m.key === item.key && m.section === section);
      if (!exists) mediaItems.push({...data, key:item.key, section});
    });
    displayMedia(currentFilter);
  });
});

// ---------------- FILTER ----------------
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    visibleCount = ITEMS_PER_PAGE;
    currentFilter = btn.dataset.filter;
    displayMedia(currentFilter);
  });
});

// ---------------- DISPLAY MEDIA ----------------
function displayMedia(filter){
  spinner.style.display = "block";
  setTimeout(() => {
    grid.innerHTML = "";
    const filtered = filter === "all" ? mediaItems : mediaItems.filter(m => m.section === filter);
    const itemsToShow = filtered.slice(0, visibleCount);

    itemsToShow.forEach(m => {
      const card = document.createElement("div");
      card.className = "item " + m.section;
      card.innerHTML = `
        ${m.type==='video' ? `<video src="${m.url}" muted loop preload="metadata"></video>` : `<img src="${m.thumb}">`}
        <div class="info">
          <span class="title">${m.title || m.section}</span>
          <p class="desc">${m.desc || ''}</p>
        </div>
        <div class="card-likes">
          <button class="like-card">❤ <span>${m.likes||0}</span></button>
        </div>
      `;

      // ---------------- VIDEO HOVER ----------------
      const vid = card.querySelector("video");
      if (vid){
        card.addEventListener("mouseenter", ()=>vid.play());
        card.addEventListener("mouseleave", ()=>vid.pause());
      }

      // ---------------- CARD CLICK PREVIEW ----------------
      card.addEventListener("click", e => {
        if(e.target.classList.contains("like-card")) return; // ignore likes click
        modal.style.display = "flex";
        const preview = modal.querySelector(".preview-content");
        const title = modal.querySelector(".preview-title");
        const desc = modal.querySelector(".preview-desc");
        const likeBtn = modal.querySelector(".like-btn");
        const likeCount = modal.querySelector(".like-count");

        preview.innerHTML = m.type==='video' ? `<video src="${m.url}" controls autoplay muted></video>` : `<img src="${m.thumb}">`;
        title.textContent = m.title || '';
        desc.textContent = m.desc || '';
        likeCount.textContent = m.likes||0;

        // ---------------- MODAL LIKE ----------------
        const userKey = localStorage.getItem("userId") || Date.now().toString(); // simple user ID
        localStorage.setItem("userId", userKey);

        likeBtn.onclick = async () => {
          if(!m.userLikes) m.userLikes = {};
          if(m.userLikes[userKey]) return alert("You already liked this!");
          m.userLikes[userKey] = true;
          const newLikes = (m.likes||0)+1;
          likeCount.textContent = newLikes;
          m.likes = newLikes;
          await update(ref(db, `${m.section}/${m.key}`), {likes: newLikes, userLikes: m.userLikes});
        }
      });

      // ---------------- CARD LIKE ----------------
      const likeCardBtn = card.querySelector(".like-card");
      likeCardBtn.onclick = async e => {
        e.stopPropagation();
        const userKey = localStorage.getItem("userId") || Date.now().toString();
        localStorage.setItem("userId", userKey);

        if(!m.userLikes) m.userLikes = {};
        if(m.userLikes[userKey]) return alert("You already liked this!");
        m.userLikes[userKey] = true;
        const newLikes = (m.likes||0)+1;
        likeCardBtn.querySelector("span").textContent = newLikes;
        m.likes = newLikes;
        await update(ref(db, `${m.section}/${m.key}`), {likes: newLikes, userLikes: m.userLikes});
      }

      grid.appendChild(card);
    });

    viewMoreBtn.style.display = filtered.length > visibleCount ? "block" : "none";
    spinner.style.display = "none";
  }, 200);
}

// ---------------- BOOK BUTTON ----------------
if(bookBtn){
  bookBtn.onclick = () => {
    document.getElementById("quoteModal").style.display = "flex";
  }
}
