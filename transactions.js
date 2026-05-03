let currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

if (currentUser.role !== "admin") {
  let adminLink = document.querySelector('a[href="admin.html"]');
  if (adminLink) adminLink.style.display = "none";
}

let allTransactions = [];
let filteredData = [];
let currentIndex = 0;
let batchSize = 10;

/* ================= DATA ================= */
function getTransactions() {
  return JSON.parse(localStorage.getItem("transactions")) || [];
}

/* ================= NORMALIZE ================= */
function normalizeTransaction(t) {

  let products = JSON.parse(localStorage.getItem("products")) || [];

  //  hanapin matching product
  let matchedProduct = products.find(p => 
    p.name?.toLowerCase() === (t.name || "").toLowerCase()
  );

  // 🔥 NEW FORMAT (items array)
  if (t.items) {
    let totalQty = t.items.reduce((s, i) => s + Number(i.qty || 0), 0);
    let firstItem = t.items[0] || {};

    let itemMatch = products.find(p =>
      p.name?.toLowerCase() === (firstItem.name || "").toLowerCase()
    );

    return {
      id: t.id || Date.now(),
      name: t.items.map(i => i.name).join(", "),
      category: firstItem.category 
        || itemMatch?.category 
        || "Uncategorized", // ✅ FIX
      buyer: t.buyer || "N/A",
      qty: totalQty,
      total: Number(t.total || 0),
      date: t.date
    };
  }

  // 🔥 OLD FORMAT
  return {
    id: t.id || Date.now(),
    name: t.name || "Unknown",

    // 🔥 MAIN FIX HERE
    category: t.category 
      || matchedProduct?.category 
      || "Uncategorized",

    buyer: t.buyer || "N/A",
    qty: Number(t.qty || 0),
    total: Number(t.total || 0),
    date: t.date
  };
}

/* ================= NOTIFICATION ================= */
function pushNotification(icon, title, desc) {
  let notifications = JSON.parse(localStorage.getItem("notifications")) || [];

  notifications.unshift({
    icon,
    title,
    desc,
    time: new Date().toISOString()
  });

  localStorage.setItem("notifications", JSON.stringify(notifications));
}

/* ================= CATEGORY ================= */
function loadCategories() {
  let filter = document.getElementById("filter");
  if (!filter) return;

  let transactions = getTransactions().map(normalizeTransaction);

  let uniqueCategories = [...new Set(
    transactions.map(t => t.category || "Others")
  )];

  filter.innerHTML = `<option value="All">All Categories</option>`;

  uniqueCategories.forEach(cat => {
    filter.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
}

/* ================= FORMAT ================= */
function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString();
}

/* ================= RENDER ================= */
function resetAndRender() {
  currentIndex = 0;
  document.getElementById("tableBody").innerHTML = "";
  renderTable();
}

function renderTable() {
  let search = document.getElementById("search")?.value.toLowerCase() || "";
  let filter = document.getElementById("filter")?.value || "All";
  let from = document.getElementById("dateFrom")?.value;
  let to = document.getElementById("dateTo")?.value;

  allTransactions = getTransactions().map(normalizeTransaction);

  filteredData = allTransactions.filter(t => {
    let matchSearch = (t.name || "").toLowerCase().includes(search);
    let matchFilter = filter === "All" || t.category === filter;

    let txnDate = new Date(t.date);
    let matchDate = true;

    if (from) matchDate = txnDate >= new Date(from);
    if (to) matchDate = matchDate && txnDate <= new Date(to);

    return matchSearch && matchFilter && matchDate;
  });

  loadMore();
}

/* ================= LOAD MORE ================= */
function loadMore() {
  let body = document.getElementById("tableBody");
  let empty = document.getElementById("emptyState");

  let nextData = filteredData.slice(currentIndex, currentIndex + batchSize);

  if (filteredData.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  } else {
    if (empty) empty.style.display = "none";
  }

  nextData.forEach(t => {
    body.innerHTML += `
      <tr>
        <td>${t.id}</td>
        <td>${t.name}</td>
        <td>${t.category}</td>
        <td>${t.buyer}</td>
        <td>${t.qty}</td>
        <td>₱${t.total.toLocaleString()}</td>
        <td>${formatDate(t.date)}</td>
        <td>${formatTime(t.date)}</td>
      </tr>
    `;
  });

  currentIndex += batchSize;
}

/* ================= SCROLL ================= */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tableContainer");

  if (container) {
    container.addEventListener("scroll", () => {
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 10
      ) {
        loadMore();
      }
    });
  }
});

/* ================= UI ================= */
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) return;

  t.innerText = msg;
  t.style.display = "block";

  setTimeout(() => t.style.display = "none", 2000);
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

/* ================= EVENTS ================= */
window.addEventListener("storage", () => {
  loadCategories();
  resetAndRender();
});

window.addEventListener("load", () => {
  loadCategories();
  resetAndRender();
});