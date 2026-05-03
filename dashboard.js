let currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

if (currentUser.role !== "admin") {
  let adminLink = document.querySelector('a[href="admin.html"]');
  if (adminLink) adminLink.style.display = "none";
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

/* ================= DATA ================= */
function getProducts() {
  return JSON.parse(localStorage.getItem("products")) || [];
}

function getTransactions() {
  return JSON.parse(localStorage.getItem("transactions")) || [];
}

function getNotifications() {
  return JSON.parse(localStorage.getItem("notifications")) || [];
}

/* ================= SALES ================= */
function getTotalSales() {
  let txns = getTransactions();
  return txns.reduce((sum, t) => sum + Number(t.total || 0), 0);
}

function getTotalItemsSold() {
  let txns = getTransactions();

  return txns.reduce((sum, t) => {
    if (t.items) {
      return sum + t.items.reduce((s, i) => s + Number(i.qty || 0), 0);
    }
    return sum + Number(t.qty || 0);
  }, 0);
}

function getTodaySales() {
  let txns = getTransactions();
  let today = new Date().toDateString();

  return txns.reduce((sum, t) => {
    let tDate = new Date(t.date).toDateString();
    return tDate === today ? sum + Number(t.total || 0) : sum;
  }, 0);
}

/* ================= CHART SETTINGS ================= */
Chart.defaults.color = "#cbd5f5";
Chart.defaults.borderColor = "rgba(255,255,255,0.1)";

let barChartInstance;
let pieChartInstance;

/* ================= DASHBOARD STATS ================= */
function updateDashboardStats() {
  let products = getProducts();

  let totalProducts = products.length;
  let lowStock = products.filter(p => Number(p.qty) <= 5).length;

  let totalValue = products.reduce((sum, p) => {
    let price = Number(String(p.price).replace(/[^\d]/g, "")) || 0;
    let qty = Number(p.qty) || 0;
    return sum + (price * qty);
  }, 0);

  document.getElementById("totalProducts").innerText = totalProducts;
  document.getElementById("lowStock").innerText = lowStock;
  document.getElementById("totalValue").innerText =
    "₱" + totalValue.toLocaleString();

  document.getElementById("totalSales").innerText =
    "₱" + getTotalSales().toLocaleString();

  document.getElementById("totalItemsSold").innerText =
    getTotalItemsSold();

  document.getElementById("dailySales").innerText =
    "₱" + getTodaySales().toLocaleString();
}

/* ================= BAR CHART ================= */
function loadBarChart() {
  const ctx = document.getElementById("barChart");
  if (!ctx) return;

  let products = getProducts();

  if (barChartInstance) barChartInstance.destroy();

  barChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: products.map(p => p.name),
      datasets: [{
        data: products.map(p => Number(p.qty) || 0),
        backgroundColor: "#6366f1",
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { display: false }, grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });
}

/* ================= PIE CHART ================= */
function loadPieChart() {
  const ctx = document.getElementById("pieChart");
  if (!ctx) return;

  let products = getProducts();

  let categoryMap = {};
  products.forEach(p => {
    let qty = Number(p.qty) || 0;
    categoryMap[p.category] = (categoryMap[p.category] || 0) + qty;
  });

  if (pieChartInstance) pieChartInstance.destroy();

  pieChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryMap),
      datasets: [{
        data: Object.values(categoryMap),
        backgroundColor: ["#4f46e5", "#22c55e", "#f59e0b", "#ef4444"],
        borderWidth: 0
      }]
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      cutout: "65%"
    }
  });
}

/* ================= LOW STOCK ================= */
function renderLowStock() {
  const container = document.getElementById("lowStockList");
  if (!container) return;

  let low = getProducts().filter(p => Number(p.qty) <= 5);

  container.innerHTML = "";

  if (low.length === 0) {
    container.innerHTML = "<p>No low stock items</p>";
    return;
  }

  low.forEach(p => {
    let qty = Number(p.qty) || 0;

    container.innerHTML += `
      <div class="stock">
        ${p.name}
        <div class="bar">
          <span style="width:${Math.min(qty * 10,100)}%"></span>
        </div>
      </div>
    `;
  });
}

/* ================= ACTIVITY ================= */
function renderActivity() {
  const container = document.getElementById("recentActivity");
  if (!container) return;

  let txns = getTransactions();
  container.innerHTML = "";

  txns.slice(0, 5).forEach(t => {
    container.innerHTML += `
      <div class="txn">
        ${t.name} sold
        <span>${t.qty} pcs → ${t.buyer || "N/A"}</span>
      </div>
    `;
  });
}

/* ================= NOTIFICATIONS (FIXED UI) ================= */
function toggleNotif() {
  document.getElementById("notifPanel").classList.toggle("show");
}

function renderNotifications() {
  let notifications = getNotifications();
  let list = document.getElementById("notifList");
  let badge = document.getElementById("notifDot");

  list.innerHTML = "";

  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty">No notifications</div>`;
    badge.style.display = "none";
    return;
  }

  badge.style.display = "flex";
  badge.innerText = notifications.length;

  notifications.forEach(n => {
    list.innerHTML += `
      <div class="notif-item">
        <div class="notif-icon">${n.icon || "🔔"}</div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-desc">${n.desc}</div>
        </div>
      </div>
    `;
  });
}

function clearNotif() {
  localStorage.removeItem("notifications");
  renderNotifications();
  renderActivity();
  showToast("Notifications cleared");
}

/* ================= EVENTS ================= */
window.addEventListener("storage", () => {
  updateDashboardStats();
  loadBarChart();
  loadPieChart();
  renderNotifications();
  renderLowStock();
  renderActivity();
});

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => toast.remove(), 3000);
}

window.addEventListener("load", () => {
  updateDashboardStats();
  loadBarChart();
  loadPieChart();
  renderNotifications();
  renderLowStock();
  renderActivity();

  setTimeout(() => {
    showToast(`Welcome back, ${currentUser.username || "User"} 👋`);
  }, 800);
});