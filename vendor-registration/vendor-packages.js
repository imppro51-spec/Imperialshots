import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  update,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ---------- AUTH CHECK ----------
const vendorLoginId = localStorage.getItem("vendorLoginId");
if(!vendorLoginId){
  window.location.href = "vendor-login.html";
}

// ---------------- CLOUDINARY ----------------
const CLOUD = "dnpy337m4";
const PRESET = "imperialshots";

// ---------------- FIREBASE ----------------
const firebaseConfig = {
  apiKey: "AIzaSyAvfmCKZQGxWdNUyqySV5IPk8DiFU4F23U",
  authDomain: "imperialshots-d468c.firebaseapp.com",
  databaseURL: "https://imperialshots-d468c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "imperialshots-d468c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------------- DOM ----------------
const container = document.getElementById("packagesContainer");
const modal = document.getElementById("packageModal");
const modalTitle = document.getElementById("modalTitle");

const pkgCoverInput = document.getElementById("pkgCoverImage");
const pkgName = document.getElementById("pkgName");
const pkgTitle = document.getElementById("pkgTitle");
const pkgDesc = document.getElementById("pkgDesc");
const pkgShortDesc = document.getElementById("pkgShortDesc");
const pkgPrice = document.getElementById("pkgPrice");
const pkgCutPrice = document.getElementById("pkgCutPrice");
const pkgBadgeText = document.getElementById("pkgBadgeText");
const pkgBadgeColor = document.getElementById("pkgBadgeColor");
const pkgStatus = document.getElementById("pkgStatus");

// 🔥 AUTO CREATE CITIES INPUT
let pkgCities = document.getElementById("pkgCities");
if(!pkgCities){
  pkgCities = document.createElement("input");
  pkgCities.id = "pkgCities";
  pkgCities.placeholder = "Cities (Mumbai, Delhi, Jaipur)";
  pkgCities.style.width = "100%";
  pkgCities.style.margin = "5px 0";
  pkgStatus.parentNode.insertBefore(pkgCities, pkgStatus);
}

let editingPackageId = null;

// ---------------- LOADER ----------------
const loader = document.createElement("div");
loader.innerHTML = `
<div style="
width:40px;height:40px;
border:4px solid #ccc;
border-top:4px solid black;
border-radius:50%;
animation:spin 1s linear infinite;
margin:auto;"></div>`;
loader.style.display = "none";
modal.appendChild(loader);

// animation
const style = document.createElement("style");
style.innerHTML = `
@keyframes spin{
0%{transform:rotate(0deg);}
100%{transform:rotate(360deg);}
}`;
document.head.appendChild(style);

// ---------------- IMAGE PREVIEW ----------------
const preview = document.createElement("img");
preview.style.maxWidth = "100px";
pkgCoverInput.after(preview);

pkgCoverInput.addEventListener("change", ()=>{
  const file = pkgCoverInput.files[0];
  preview.src = file ? URL.createObjectURL(file) : "";
});

// ---------------- LOAD ONLY MY PACKAGES ----------------
onValue(ref(db,"packages"), snap=>{
  container.innerHTML = "";

  if(!snap.exists()){
    container.innerHTML = "<p>No packages found</p>";
    return;
  }

  snap.forEach(child=>{
    const p = child.val();

    // 🔥 FILTER BY VENDOR
    if(p.vendorLoginId !== vendorLoginId) return;

    const div = document.createElement("div");
    div.className = "package-card";

    div.innerHTML = `
      ${p.coverImage ? `<img src="${p.coverImage}" style="width:100%;max-height:150px;object-fit:cover;">` : ""}
      <h3>${p.name}</h3>
      <p>₹${p.price}</p>
      <p>Status: ${p.status}</p>
      <p>Cities: ${p.availableCities ? Object.keys(p.availableCities).join(", ") : "-"}</p>

      ${p.badgeText ? `<span style="background:${p.badgeColor};padding:3px 8px;border-radius:4px;">${p.badgeText}</span>` : ""}

      <br><br>
      <button onclick="editPackage('${child.key}')">Edit</button>
      <button onclick="deletePackage('${child.key}')">Delete</button>
    `;

    container.appendChild(div);
  });
});

// ---------------- OPEN MODAL ----------------
window.openAddModal = ()=>{
  editingPackageId = null;
  modalTitle.innerText = "Add Package";
  modal.style.display = "flex";
  clearFields();
};

// ---------------- EDIT ----------------
window.editPackage = async (id)=>{
  editingPackageId = id;

  const snap = await get(ref(db,"packages/"+id));
  if(!snap.exists()) return;

  const p = snap.val();

  pkgName.value = p.name || "";
  pkgTitle.value = p.title || "";
  pkgDesc.value = p.description || "";
  pkgShortDesc.value = p.shortDescription || "";
  pkgPrice.value = p.price || "";
  pkgCutPrice.value = p.cutPrice || "";
  pkgBadgeText.value = p.badgeText || "";
  pkgBadgeColor.value = p.badgeColor || "#ff0000";
  pkgStatus.value = p.status || "active";

  pkgCities.value = p.availableCities
    ? Object.keys(p.availableCities).join(", ")
    : "";

  preview.src = p.coverImage || "";

  modal.style.display = "flex";
};

// ---------------- DELETE ----------------
window.deletePackage = (id)=>{
  if(confirm("Delete package?")){
    remove(ref(db,"packages/"+id));
  }
};

// ---------------- SAVE ----------------
window.savePackage = async ()=>{

  loader.style.display = "block";

  let coverImageUrl = preview.src || null;
  let existingData = {};

  if(editingPackageId){
    const snap = await get(ref(db,"packages/"+editingPackageId));
    if(snap.exists()){
      existingData = snap.val();
      if(!pkgCoverInput.files.length){
        coverImageUrl = existingData.coverImage || null;
      }
    }
  }

  // Upload image
  if(pkgCoverInput.files.length > 0){
    const file = pkgCoverInput.files[0];
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,{
      method:"POST",
      body:fd
    });

    const img = await res.json();
    coverImageUrl = img.secure_url;
  }

  // Cities convert
  const cityArray = pkgCities.value.split(",").map(c=>c.trim()).filter(c=>c);
  const availableCities = {};
  cityArray.forEach(c=>availableCities[c]=true);

  const data = {
    name: pkgName.value.trim(),
    title: pkgTitle.value.trim(),
    description: pkgDesc.value.trim(),
    shortDescription: pkgShortDesc.value.trim(),
    price: Number(pkgPrice.value),
    cutPrice: Number(pkgCutPrice.value),
    badgeText: pkgBadgeText.value.trim(),
    badgeColor: pkgBadgeColor.value,
    coverImage: coverImageUrl,
    status: pkgStatus.value,
    availableCities: availableCities,

    // 🔥 MOST IMPORTANT
    vendorLoginId: vendorLoginId,

    rating: existingData.rating || 0,
    totalRatings: existingData.totalRatings || 0
  };

  if(editingPackageId){
    await update(ref(db,"packages/"+editingPackageId), data);
  }else{
    await set(push(ref(db,"packages")), data);
  }

  loader.style.display = "none";
  modal.style.display = "none";
  clearFields();
};

// ---------------- CLOSE ----------------
window.closeModal = ()=>{
  modal.style.display = "none";
};

// ---------------- CLEAR ----------------
function clearFields(){
  pkgCoverInput.value = "";
  preview.src = "";
  pkgName.value = "";
  pkgTitle.value = "";
  pkgDesc.value = "";
  pkgShortDesc.value = "";
  pkgPrice.value = "";
  pkgCutPrice.value = "";
  pkgBadgeText.value = "";
  pkgBadgeColor.value = "#ff0000";
  pkgCities.value = "";
  pkgStatus.value = "active";
}