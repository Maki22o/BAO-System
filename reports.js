if (!window.currentUser) {
  window.currentUser = JSON.parse(localStorage.getItem("currentUser"));
}

if (!window.currentUser) {
  window.location.href = "index.html";
}

let chart;

/* ================= GET DATA ================= */
function getTransactions() {
  return JSON.parse(localStorage.getItem("transactions")) || [];
}

/* ================= NORMALIZE ================= */
function normalizeTransactions(txns) {
  let normalized = [];

  txns.forEach(t => {

    // NEW FORMAT
    if (t.items) {
      t.items.forEach(i => {
        normalized.push({
          name: i.name || "Unknown",
          qty: Number(i.qty || 0),
          total: Number(i.qty || 0) * Number(i.price || 0),
          date: t.date
        });
      });
    } 
    // OLD FORMAT
    else {
      normalized.push({
        name: t.name || "Unknown",
        qty: Number(t.qty || 0),
        total: Number(t.total || 0),
        date: t.date
      });
    }

  });

  return normalized;
}

/* ================= SAFE GET ================= */
function getEl(id) {
  return document.getElementById(id);
}

/* ================= LOAD REPORT ================= */
function loadReports() {

  let raw = getTransactions();
  let transactions = normalizeTransactions(raw);

  let start = getEl("startDate")?.value;
  let end = getEl("endDate")?.value;

  let startDate = start ? new Date(start + "T00:00:00") : null;
  let endDate = end ? new Date(end + "T23:59:59") : null;

  let filtered = transactions.filter(t => {
    let d = new Date(t.date);

    if (isNaN(d)) return false;

    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;

    return true;
  });

  if (filtered.length === 0 && transactions.length > 0) {
    filtered = transactions;
  }

  /* ================= STATS ================= */
  let totalSales = filtered.reduce((sum, t) => sum + Number(t.total || 0), 0);
  let totalTxns = filtered.length;
  let avg = totalTxns ? totalSales / totalTxns : 0;

  if (getEl("totalSales"))
    getEl("totalSales").innerText = "₱" + totalSales.toLocaleString();

  if (getEl("totalTxns"))
    getEl("totalTxns").innerText = totalTxns;

  if (getEl("avgSale"))
    getEl("avgSale").innerText = "₱" + avg.toFixed(2);

  /* ================= PRODUCT PERFORMANCE ================= */
  let map = {};

  filtered.forEach(t => {
    let name = t.name || "Unknown";

    if (!map[name]) {
      map[name] = { qty: 0, revenue: 0 };
    }

    map[name].qty += Number(t.qty || 0);
    map[name].revenue += Number(t.total || 0);
  });

  let table = getEl("reportTable");
  if (table) {
    table.innerHTML = "";

    let sorted = Object.entries(map).sort((a, b) => b[1].qty - a[1].qty);

    if (sorted.length === 0) {
      table.innerHTML = `<tr><td colspan="3">No data</td></tr>`;
    }

    sorted.forEach(([name, data]) => {
      table.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${data.qty}</td>
          <td>₱${data.revenue.toLocaleString()}</td>
        </tr>
      `;
    });

    /* ================= INSIGHTS ================= */
    let insights = getEl("insights");
    if (insights) {
      insights.innerHTML = "";

      if (sorted.length > 0) {
        insights.innerHTML += `<p>Top Product: <b>${sorted[0][0]}</b></p>`;
      }

      if (sorted.length > 1) {
        let last = sorted[sorted.length - 1][0];
        insights.innerHTML += `<p>Low Performing: <b>${last}</b></p>`;
      }

      if (totalSales === 0) {
        insights.innerHTML += `<p>No sales in selected range</p>`;
      }

      if (totalSales > 0) {
        insights.innerHTML += `<p>Total Revenue: ₱${totalSales.toLocaleString()}</p>`;
      }
    }
  }

  /* ================= CHART ================= */
  let canvas = getEl("salesChart");

  if (canvas) {
    let daily = {};

    filtered.forEach(t => {
      let d = new Date(t.date).toLocaleDateString();
      if (!daily[d]) daily[d] = 0;
      daily[d] += Number(t.total || 0);
    });

    let labels = Object.keys(daily);
    let values = Object.values(daily);

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
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.05)" }
          }
        }
      }
    });
  }
}

/* ================= EVENTS ================= */
window.addEventListener("storage", loadReports);
window.addEventListener("focus", loadReports);
window.onload = loadReports;