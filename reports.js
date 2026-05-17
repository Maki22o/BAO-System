const supabaseClient =
  window.appSupabase;

let currentUser = null;

let salesChart = null;

let categoryChart = null;

let transactions = [];

/* =========================================
   HELPERS
========================================= */

function getEl(id){

  return document.getElementById(id);
}

function peso(value){

  return `₱${Number(value || 0).toLocaleString()}`;
}

function safeNumber(value){

  return Number(value || 0);
}

/* =========================================
   AUTH
========================================= */

async function checkAuth(){

  const ok =
    await window
      .initProtectedPageAuth();

  if(!ok) return false;

  currentUser =
    window.appAuth.user;

  return true;
}

/* =========================================
   TOAST
========================================= */

function showToast(message){

  let toast =
    getEl("toast");

  if(!toast){

    toast =
      document.createElement(
        "div"
      );

    toast.id = "toast";

    document.body.appendChild(
      toast
    );
  }

  toast.innerText =
    message;

  toast.classList.add(
    "show"
  );

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

  }, 2600);
}

/* =========================================
   LOGOUT
========================================= */

function logout(){

  supabaseClient.auth
    .signOut()
    .finally(() => {

      window.location.href =
        "index.html";
    });
}

/* =========================================
   FETCH TRANSACTIONS
========================================= */

async function fetchTransactions(){

  try{

    const { data, error } =
      await supabaseClient

        .from("transactions")

        .select(`
          *,
          products (
            id,
            name,
            category_id,
            price,
            categories (
              id,
              name
            )
          )
        `)

        .order("created_at", {

          ascending: true
        });

    if(error){

      throw error;
    }

    transactions = data || [];

  }catch(error){

    console.error(error);

    transactions = [];

    showToast(
      "Unable to load reports"
    );
  }
}

/* =========================================
   FILTER TRANSACTIONS
========================================= */

function filterTransactions(){

  const start =
    getEl("startDate")?.value;

  const end =
    getEl("endDate")?.value;

  const startDate =

    start

    ? new Date(
        `${start}T00:00:00`
      )

    : null;

  const endDate =

    end

    ? new Date(
        `${end}T23:59:59`
      )

    : null;

  return transactions.filter(
    transaction => {

      const date =
        new Date(
          transaction.created_at
        );

      if(startDate && date < startDate)
        return false;

      if(endDate && date > endDate)
        return false;

      return true;
    }
  );
}

/* =========================================
   KPI
========================================= */

function renderKPIs(filtered){

  const totalSales =
    filtered.reduce(
      (sum, transaction) =>

        sum +
        safeNumber(
          transaction.total
        ),

      0
    );

  const totalTransactions =
    filtered.length;

  const totalItems =
    filtered.reduce(
      (sum, transaction) =>

        sum +
        safeNumber(
          transaction.quantity
        ),

      0
    );

  const averageSale =

    totalTransactions

    ? totalSales /
      totalTransactions

    : 0;

  getEl("totalSales")
    .innerText =
      peso(totalSales);

  getEl("totalTxns")
    .innerText =
      totalTransactions;

  getEl("avgSale")
    .innerText =
      peso(
        averageSale.toFixed(2)
      );

  getEl("totalItems")
    .innerText =
      totalItems;

  return {

    totalSales,
    totalTransactions,
    totalItems,
    averageSale
  };
}

/* =========================================
   PRODUCT ANALYTICS
========================================= */

function buildProductAnalytics(filtered){

  const productMap = {};

  filtered.forEach(transaction => {

    const productName =

      transaction.products?.name ||

      "Unknown Product";

    const categoryName =

      transaction.products
        ?.categories?.name ||

      "Uncategorized";

    const productPrice =
      safeNumber(
        transaction.products?.price
      );

    if(!productMap[productName]){

      productMap[productName] = {

        category:
          categoryName,

        sold: 0,

        revenue: 0,

        avgPrice:
          productPrice
      };
    }

    productMap[productName]
      .sold += safeNumber(
        transaction.quantity
      );

    productMap[productName]
      .revenue += safeNumber(
        transaction.total
      );
  });

  return productMap;
}

/* =========================================
   REPORT TABLE
========================================= */

function renderReportTable(productMap){

  const reportTable =
    getEl("reportTable");

  if(!reportTable) return;

  reportTable.innerHTML = "";

  const sorted =
    Object.entries(productMap)

      .sort(
        (a, b) =>

          b[1].revenue -
          a[1].revenue
      );

  if(sorted.length === 0){

    reportTable.innerHTML = `

      <tr class="loading-row">

        <td colspan="5">

          No report data found

        </td>

      </tr>
    `;

    return;
  }

  sorted.forEach(([name, data]) => {

    reportTable.innerHTML += `

      <tr>

        <td>

          ${name}

        </td>

        <td>

          ${data.category}

        </td>

        <td>

          ${data.sold}

        </td>

        <td>

          ${peso(data.revenue)}

        </td>

        <td>

          ${peso(data.avgPrice)}

        </td>

      </tr>
    `;
  });
}

/* =========================================
   INSIGHTS
========================================= */

function renderInsights(
  productMap,
  totals
){

  const insights =
    getEl("insights");

  if(!insights) return;

  insights.innerHTML = "";

  const sorted =
    Object.entries(productMap)

      .sort(
        (a, b) =>

          b[1].revenue -
          a[1].revenue
      );

  if(sorted.length > 0){

    insights.innerHTML += `

      <div class="insight-item">

        <div class="insight-label">

          Top Revenue Product

        </div>

        <div class="insight-value">

          ${sorted[0][0]}

        </div>

      </div>
    `;

    insights.innerHTML += `

      <div class="insight-item">

        <div class="insight-label">

          Best Performing Category

        </div>

        <div class="insight-value">

          ${sorted[0][1].category}

        </div>

      </div>
    `;
  }

  insights.innerHTML += `

    <div class="insight-item">

      <div class="insight-label">

        Total Revenue Generated

      </div>

      <div class="insight-value">

        ${peso(totals.totalSales)}

      </div>

    </div>
  `;

  insights.innerHTML += `

    <div class="insight-item">

      <div class="insight-label">

        Average Transaction Value

      </div>

      <div class="insight-value">

        ${peso(totals.averageSale)}

      </div>

    </div>
  `;
}

/* =========================================
   SALES TREND CHART
========================================= */

function renderSalesChart(filtered){

  const trend =
    getEl("trendRange")
    ?.value || "Daily";

  const grouped = {};

  filtered.forEach(transaction => {

    const date =
      new Date(
        transaction.created_at
      );

    let label = "";

    if(trend === "Daily"){

      label =
        date.toLocaleDateString();

    }else if(trend === "Weekly"){

      const week =
        Math.ceil(
          date.getDate() / 7
        );

      label =
        `Week ${week}`;

    }else{

      label =
        date.toLocaleString(
          "default",
          {
            month: "long"
          }
        );
    }

    if(!grouped[label]){

      grouped[label] = 0;
    }

    grouped[label] +=
      safeNumber(
        transaction.total
      );
  });

  const salesCanvas =
    getEl("salesChart");

  if(!salesCanvas) return;

  if(salesChart){

    salesChart.destroy();
  }

  const ctx =
    salesCanvas.getContext("2d");

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      400
    );

  gradient.addColorStop(
    0,
    "rgba(124,58,237,0.45)"
  );

  gradient.addColorStop(
    1,
    "rgba(124,58,237,0)"
  );

  salesChart =
    new Chart(ctx, {

      type: "line",

      data: {

        labels:
          Object.keys(grouped),

        datasets: [{

          data:
            Object.values(grouped),

          borderColor:
            "#8b5cf6",

          backgroundColor:
            gradient,

          fill: true,

          tension: 0.45,

          borderWidth: 3,

          pointRadius: 4,

          pointHoverRadius: 6,

          pointBackgroundColor:
            "#8b5cf6"
        }]
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {

            display: false
          }
        },

        scales: {

          x: {

            grid: {

              color:
                "rgba(255,255,255,0.04)"
            }
          },

          y: {

            beginAtZero: true,

            grid: {

              color:
                "rgba(255,255,255,0.05)"
              }
          }
        }
      }
    });
}

/* =========================================
   CATEGORY CHART
========================================= */

function renderCategoryChart(filtered){

  const categoryMap = {};

  filtered.forEach(transaction => {

    const category =

      transaction.products
        ?.categories?.name ||

      "Uncategorized";

    if(!categoryMap[category]){

      categoryMap[category] = 0;
    }

    categoryMap[category] +=
      safeNumber(
        transaction.total
      );
  });

  const categoryCanvas =
    getEl("categoryChart");

  if(!categoryCanvas) return;

  if(categoryChart){

    categoryChart.destroy();
  }

  categoryChart =
    new Chart(categoryCanvas, {

      type: "doughnut",

      data: {

        labels:
          Object.keys(categoryMap),

        datasets: [{

          data:
            Object.values(categoryMap),

          backgroundColor: [

            "#8b5cf6",
            "#22c55e",
            "#f59e0b",
            "#3b82f6",
            "#ec4899",
            "#14b8a6"
          ],

          borderWidth: 0
        }]
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        cutout: "68%",

        plugins: {

          legend: {

            position: "bottom"
          }
        }
      }
    });
}

/* =========================================
   LOAD REPORTS
========================================= */

async function loadReports(){

  const reportTable =
    getEl("reportTable");

  if(reportTable){

    reportTable.innerHTML = `

      <tr class="loading-row">

        <td colspan="5">

          Loading report analytics...

        </td>

      </tr>
    `;
  }

  await fetchTransactions();

  const filtered =
    filterTransactions();

  const totals =
    renderKPIs(filtered);

  const productMap =
    buildProductAnalytics(
      filtered
    );

  renderReportTable(
    productMap
  );

  renderInsights(
    productMap,
    totals
  );

  renderSalesChart(
    filtered
  );

  renderCategoryChart(
    filtered
  );

  lucide.createIcons();
}

/* =========================================
   INIT
========================================= */

window.addEventListener(
  "load",
  async () => {

    const ok =
      await checkAuth();

    if(!ok) return;

    await loadReports();

    // Backup RBAC

    const backupLink =
      getEl("backupLink");

    if(backupLink){

      backupLink.style.display =

        window.appAuth.role ===
        "admin_user"

        ? ""

        : "none";
    }

    // Realtime chart updates

    const trendRange =
      getEl("trendRange");

    if(trendRange){

      trendRange.addEventListener(
        "change",
        loadReports
      );
    }

    lucide.createIcons();

    console.log(
      "Reports initialized successfully"
    );
  }
);