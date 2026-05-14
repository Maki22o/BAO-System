const SUPABASE_URL = "https://dpdchbusvfktlqjaxdlb.supabase.co";
const SUPABASE_KEY = "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNER_COLUMNS = ["user_id", "owner_id", "created_by"];
const CATEGORY_LABEL_COLUMNS = ["name", "category", "title", "label"];

let currentUser = null;
let ownerColumn = "user_id";
let barChartInstance = null;
let pieChartInstance = null;
let products = [];
let categories = [];
let transactions = [];
let notifications = [];

function logSupabaseError(stage, error, context = {}) {
  console.error(`[Dashboard:${stage}]`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
    context
  });
}

function updateThemeIcon(isLight) {
  const themeIcon = document.getElementById("themeIcon");
  if (!themeIcon) return;
  themeIcon.innerHTML = isLight ? `<i data-lucide="sun"></i>` : `<i data-lucide="moon"></i>`;
  lucide.createIcons();
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const isLight = savedTheme === "light";
  if (isLight) document.body.classList.add("light-mode");
  updateThemeIcon(isLight);
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const light = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", light ? "light" : "dark");
    updateThemeIcon(light);
  });
}

async function checkAuth() {
  const ok = await window.initProtectedPageAuth();
  if (!ok) return false;
  currentUser = window.appAuth.user;
  return true;
}

function loadUserInfo() {
  const el = document.getElementById("userName");
  const roleEl = document.getElementById("userRoleLabel");
  const avatarEl = document.querySelector(".user-avatar");
  if (!el || !currentUser) return;
  const fullName =
    window.appAuth.profile?.fullname ||
    window.appAuth.profile?.full_name ||
    currentUser.user_metadata?.fullname ||
    currentUser.email ||
    "User";

  el.innerText = fullName;

  if (roleEl) {
    roleEl.innerText =
      window.mapRoleLabel(window.appAuth.role);
  }

  if (avatarEl) {
    avatarEl.innerText =
      String(fullName).trim().charAt(0).toUpperCase() || "U";
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle("show");
  overlay.classList.toggle("show");
}

function toggleNotif() {
  const panel = document.getElementById("notifPanel");
  if (panel) panel.classList.toggle("show");
}

async function fetchCategories() {
  const { data, error } = await supabaseClient.from("categories").select("*").limit(1000);
  if (error) {
    logSupabaseError("fetchCategories", error);
    categories = [];
    return;
  }
  categories = (data || []).map((row) => ({
    id: row.id ?? row.category_id,
    label: CATEGORY_LABEL_COLUMNS.map((k) => row[k]).find(Boolean) || "Uncategorized"
  }));
}

function categoryLabelById(id) {
  const match = categories.find((c) => String(c.id) === String(id));
  return match?.label || "Uncategorized";
}

async function fetchOwned(table, selectClause) {
  let data = null;
  let error = null;
  ({ data, error } = await supabaseClient.from(table).select(selectClause).eq(ownerColumn, currentUser.id));
  if (error) {
    const msg = `${error.message || ""} ${error.details || ""}`.toLowerCase();
    if (msg.includes("column") && msg.includes(ownerColumn.toLowerCase())) {
      ({ data, error } = await supabaseClient.from(table).select(selectClause));
    }
  }
  if (error) throw error;
  return data || [];
}

async function fetchProducts() {
  try {
    const data = await fetchOwned("products", "*");
    products = data
      .filter((row) => {
        const owner = row.user_id ?? row.owner_id ?? row.created_by  ?? null;
        return !owner || String(owner) === String(currentUser.id);
      })
      .map((row) => ({
        id: row.id,
        name: row.name ?? row.product_name ?? "Unnamed",
        qty: Number(row.qty ?? row.quantity ?? row.stock ?? 0),
        price: Number(row.price ?? row.unit_price ?? 0),
        category: categoryLabelById(row.category_id),
        category_id: row.category_id ?? null
      }));
  } catch (error) {
    logSupabaseError("fetchProducts", error, { ownerColumn });
    products = [];
  }
}

async function fetchTransactions() {
  try {
    const data = await fetchOwned("transactions", "*");
    transactions = data
      .filter((row) => {
        const owner = row.user_id ?? row.owner_id ?? row.created_by  ?? null;
        return !owner || String(owner) === String(currentUser.id);
      })
      .map((row) => ({
        id: row.id,
        name: row.product_name ?? row.name ?? "Unknown",
        buyer: row.buyer_name ?? row.buyer ?? "N/A",
        qty: Number(row.qty ?? row.quantity ?? 0),
        total: Number(row.total ?? row.total_amount ?? 0),
        date: row.created_at ?? row.date ?? new Date().toISOString()
      }));
  } catch (error) {
    logSupabaseError("fetchTransactions", error, { ownerColumn });
    transactions = [];
  }
}

async function fetchNotifications() {
  try {
    const data = await fetchOwned("notifications", "*");
    notifications = data
      .filter((row) => {
        const owner = row.user_id ?? row.owner_id ?? row.created_by  ?? null;
        return !owner || String(owner) === String(currentUser.id);
      })
      .map((row) => ({
        id: row.id,
        icon: row.icon ?? "Bell",
        title: row.title ?? "Notification",
        desc: row.description ?? row.desc ?? "",
        created_at: row.created_at ?? new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    logSupabaseError("fetchNotifications", error, { ownerColumn });
    notifications = [];
  }
}

function getTotalSales() {
  return transactions.reduce((sum, t) => sum + Number(t.total || 0), 0);
}

function getTotalItemsSold() {
  return transactions.reduce((sum, t) => sum + Number(t.qty || 0), 0);
}

function getTodaySales() {
  const today = new Date().toDateString();
  return transactions.reduce((sum, t) => {
    const d = new Date(t.date).toDateString();
    return d === today ? sum + Number(t.total || 0) : sum;
  }, 0);
}

function updateDashboardStats() {
  const totalProducts = products.length;
  const lowStock = products.filter((p) => p.qty <= 5).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.qty, 0);

  document.getElementById("totalProducts").innerText = totalProducts;
  document.getElementById("lowStock").innerText = lowStock;
  document.getElementById("totalValue").innerText = `P${totalValue.toLocaleString()}`;
  document.getElementById("totalSales").innerText = `P${getTotalSales().toLocaleString()}`;
  document.getElementById("totalItemsSold").innerText = getTotalItemsSold();
  document.getElementById("dailySales").innerText = `P${getTodaySales().toLocaleString()}`;
}

function loadBarChart() {
  const canvas = document.getElementById("barChart");
  if (!canvas) return;
  if (barChartInstance) barChartInstance.destroy();
  barChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: products.map((p) => p.name),
      datasets: [{ data: products.map((p) => p.qty), backgroundColor: "#6366f1", borderRadius: 8 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { display: false }, grid: { display: false } }, y: { beginAtZero: true } }
    }
  });
}

function loadPieChart() {
  const canvas = document.getElementById("pieChart");
  if (!canvas) return;
  if (pieChartInstance) pieChartInstance.destroy();

  const categoryMap = {};
  products.forEach((p) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + Number(p.qty || 0);
  });

  pieChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryMap),
      datasets: [{ data: Object.values(categoryMap), backgroundColor: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, cutout: "68%" }
  });
}

function renderLowStock() {
  const container = document.getElementById("lowStockList");
  if (!container) return;
  const low = products.filter((p) => Number(p.qty) <= 5);
  container.innerHTML = "";
  if (low.length === 0) {
    container.innerHTML = "<p>No low stock items</p>";
    return;
  }
  low.forEach((p) => {
    const qty = Number(p.qty) || 0;
    container.innerHTML += `<div class="stock">${p.name}<div class="bar"><span style="width:${Math.min(qty * 10, 100)}%"></span></div></div>`;
  });
}

function renderActivity() {
  const container = document.getElementById("recentActivity");
  if (!container) return;
  container.innerHTML = "";
  transactions.slice(0, 5).forEach((t) => {
    container.innerHTML += `<div class="txn">${t.name} sold<span>${t.qty} pcs -> ${t.buyer || "N/A"}</span></div>`;
  });
}

function renderNotifications() {
  const list = document.getElementById("notifList");
  const badge = document.getElementById("notifDot");
  if (!list || !badge) return;

  list.innerHTML = "";
  if (notifications.length === 0) {
    list.innerHTML = `<div class="notif-empty">No notifications</div>`;
    badge.style.display = "none";
    return;
  }

  badge.style.display = "flex";
  badge.innerText = notifications.length;

  notifications.forEach((n) => {
    list.innerHTML += `<div class="notif-item"><div class="notif-icon">${n.icon}</div><div class="notif-content"><div class="notif-title">${n.title}</div><div class="notif-desc">${n.desc}</div></div></div>`;
  });
}

async function clearNotif() {
  try {
    await supabaseClient.from("notifications").delete().eq(ownerColumn, currentUser.id);
  } catch (error) {
    logSupabaseError("clearNotifications", error);
  }
  notifications = [];
  renderNotifications();
  showToast("Notifications cleared");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => toast.remove(), 3000);
}

async function refreshDashboardData() {
  await fetchCategories();
  await fetchProducts();
  await fetchTransactions();
  await fetchNotifications();
  updateDashboardStats();
  loadBarChart();
  loadPieChart();
  renderNotifications();
  renderLowStock();
  renderActivity();
}

window.addEventListener("load", async () => {
  initTheme();
  const ok = await checkAuth();
  if (!ok) return;
  loadUserInfo();
  await refreshDashboardData();
  setTimeout(() => {
    showToast(`Welcome back, ${currentUser?.user_metadata?.fullname || currentUser?.email || "User"}`);
  }, 800);
});
