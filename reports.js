const SUPABASE_URL = "https://dpdchbusvfktlqjaxdlb.supabase.co";
const SUPABASE_KEY = "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNER_COLUMNS = ["user_id", "owner_id", "created_by"];

let currentUser = null;
let ownerColumn = "user_id";
let chart = null;
let normalized = [];

function logSupabaseError(stage, error, context = {}) {
  console.error(`[Reports:${stage}]`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
    context
  });
}

async function checkAuth() {
  const ok = await window.initProtectedPageAuth();
  if (!ok) return false;
  currentUser = window.appAuth.user;
  return true;
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

function normalizeTransactions(rows) {
  return rows
    .filter((row) => {
      const owner = row.user_id ?? row.owner_id ?? row.created_by  ?? null;
      return !owner || String(owner) === String(currentUser.id);
    })
    .map((row) => ({
      name: row.product_name ?? row.name ?? "Unknown",
      qty: Number(row.qty ?? row.quantity ?? 0),
      total: Number(row.total ?? row.total_amount ?? 0),
      date: row.created_at ?? row.date ?? new Date().toISOString()
    }));
}

function getEl(id) {
  return document.getElementById(id);
}

function logout() {
  supabaseClient.auth.signOut().finally(() => {
    window.location.href = "index.html";
  });
}

async function loadReports() {
  try {
    const rows = await fetchOwned("transactions", "*");
    normalized = normalizeTransactions(rows);
  } catch (error) {
    logSupabaseError("loadTransactions", error, { ownerColumn });
    normalized = [];
  }

  const start = getEl("startDate")?.value;
  const end = getEl("endDate")?.value;
  const startDate = start ? new Date(`${start}T00:00:00`) : null;
  const endDate = end ? new Date(`${end}T23:59:59`) : null;

  let filtered = normalized.filter((t) => {
    const d = new Date(t.date);
    if (isNaN(d)) return false;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  if (filtered.length === 0 && normalized.length > 0) filtered = normalized;

  const totalSales = filtered.reduce((sum, t) => sum + Number(t.total || 0), 0);
  const totalTxns = filtered.length;
  const avg = totalTxns ? totalSales / totalTxns : 0;

  if (getEl("totalSales")) getEl("totalSales").innerText = `P${totalSales.toLocaleString()}`;
  if (getEl("totalTxns")) getEl("totalTxns").innerText = totalTxns;
  if (getEl("avgSale")) getEl("avgSale").innerText = `P${avg.toFixed(2)}`;

  const map = {};
  filtered.forEach((t) => {
    if (!map[t.name]) map[t.name] = { qty: 0, revenue: 0 };
    map[t.name].qty += Number(t.qty || 0);
    map[t.name].revenue += Number(t.total || 0);
  });

  const table = getEl("reportTable");
  if (table) {
    table.innerHTML = "";
    const sorted = Object.entries(map).sort((a, b) => b[1].qty - a[1].qty);
    if (sorted.length === 0) table.innerHTML = `<tr><td colspan="3">No data</td></tr>`;
    sorted.forEach(([name, data]) => {
      table.innerHTML += `<tr><td>${name}</td><td>${data.qty}</td><td>P${data.revenue.toLocaleString()}</td></tr>`;
    });

    const insights = getEl("insights");
    if (insights) {
      insights.innerHTML = "";
      if (sorted.length > 0) insights.innerHTML += `<p>Top Product: <b>${sorted[0][0]}</b></p>`;
      if (sorted.length > 1) insights.innerHTML += `<p>Low Performing: <b>${sorted[sorted.length - 1][0]}</b></p>`;
      if (totalSales === 0) insights.innerHTML += `<p>No sales in selected range</p>`;
      if (totalSales > 0) insights.innerHTML += `<p>Total Revenue: P${totalSales.toLocaleString()}</p>`;
    }
  }

  const canvas = getEl("salesChart");
  if (!canvas) return;

  const daily = {};
  filtered.forEach((t) => {
    const d = new Date(t.date).toLocaleDateString();
    if (!daily[d]) daily[d] = 0;
    daily[d] += Number(t.total || 0);
  });

  const labels = Object.keys(daily);
  const values = Object.values(daily);
  if (chart) chart.destroy();

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.2)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });
}

window.addEventListener("load", async () => {
  const ok = await checkAuth();
  if (!ok) return;
  await loadReports();
});
