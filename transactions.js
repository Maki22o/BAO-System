const SUPABASE_URL = "https://dpdchbusvfktlqjaxdlb.supabase.co";
const SUPABASE_KEY = "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const OWNER_COLUMNS = ["user_id", "owner_id", "created_by"];
let currentUser = null;
let ownerColumn = "user_id";
let allTransactions = [];
let filteredData = [];
let currentIndex = 0;
const batchSize = 20;

function logSupabaseError(stage, error, context = {}) {
  console.error(`[Transactions:${stage}]`, {
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

function normalizeTransaction(row) {
  return {
    id: row.id,
    name: row.products?.name,
    category: row.products?.categories?.name,
    buyer: row.buyer_name ?? row.buyer ?? "",
    qty: Number(row.qty ?? row.quantity ?? 0),
    total: Number(row.total ?? row.total_amount ?? 0),
    date: row.created_at ?? row.date
  };
}

async function fetchTransactions() {
  try {
    let rows = [];
    let error = null;

    ({
      data: rows,
      error
    } = await supabaseClient
      .from("transactions")
      .select(`
        *,
        products:product_id!inner (
          id,
          name,
          category_id,
          categories:category_id!inner (
            id,
            name
          )
        )
      `)
      .eq(ownerColumn, currentUser.id));

    if (error) {
      const msg = `${error.message || ""} ${error.details || ""}`.toLowerCase();
      if (msg.includes("column") && msg.includes(ownerColumn.toLowerCase())) {
        ({
          data: rows,
          error
        } = await supabaseClient
          .from("transactions")
          .select(`
            *,
            products:product_id!inner (
              id,
              name,
              category_id,
              categories:category_id!inner (
                id,
                name
              )
            )
          `));
      }
    }

    if (error) throw error;

    allTransactions = rows
      .filter((row) => {
        const owner = row.user_id ?? row.owner_id ?? row.created_by ?? null;
        return !owner || String(owner) === String(currentUser.id);
      })
      .map(normalizeTransaction)
      .filter((t) => t.name && t.category && t.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    logSupabaseError("fetchTransactions", error, { ownerColumn });
    allTransactions = [];
    showToast("Unable to load transactions");
  }
}

function loadCategoriesFilter() {
  const filter = document.getElementById("filter");
  if (!filter) return;
  const current = filter.value;
  const unique = [...new Set(allTransactions.map((t) => t.category).filter(Boolean))];

  filter.innerHTML = `<option value="All">All Categories</option>`;
  unique.forEach((cat) => {
    filter.innerHTML += `<option value="${cat}">${cat}</option>`;
  });

  if (current && [...filter.options].some((o) => o.value === current)) {
    filter.value = current;
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString();
}

function resetAndRender() {
  currentIndex = 0;
  const body = document.getElementById("tableBody");
  if (body) body.innerHTML = "";
  renderTable();
}

function renderTable() {
  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const filter = document.getElementById("filter")?.value || "All";
  const from = document.getElementById("dateFrom")?.value;
  const to = document.getElementById("dateTo")?.value;

  filteredData = allTransactions.filter((t) => {
    const matchSearch = (t.name || "").toLowerCase().includes(search);
    const matchFilter = filter === "All" || t.category === filter;
    const txnDate = new Date(t.date);
    let matchDate = true;
    if (from) matchDate = txnDate >= new Date(from);
    if (to) matchDate = matchDate && txnDate <= new Date(`${to}T23:59:59`);
    return matchSearch && matchFilter && matchDate;
  });

  loadMore();
}

function loadMore() {
  const body = document.getElementById("tableBody");
  const empty = document.getElementById("emptyState");
  if (!body || !empty) return;

  const nextData = filteredData.slice(currentIndex, currentIndex + batchSize);
  if (filteredData.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  nextData.forEach((t) => {
    body.innerHTML += `
      <tr>
        <td>${t.id}</td>
        <td>${t.name}</td>
        <td>${t.category}</td>
        <td>${t.buyer}</td>
        <td>${t.qty}</td>
        <td>P${t.total.toLocaleString()}</td>
        <td>${formatDate(t.date)}</td>
        <td>${formatTime(t.date)}</td>
      </tr>
    `;
  });
  currentIndex += batchSize;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 2200);
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("tableContainer");
  if (container) {
    container.addEventListener("scroll", () => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
        loadMore();
      }
    });
  }
});

window.addEventListener("load", async () => {
  const ok = await checkAuth();
  if (!ok) return;
  await fetchTransactions();
  loadCategoriesFilter();
  resetAndRender();
});
