const SUPABASE_URL =
  "https://dpdchbusvfktlqjaxdlb.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let currentUser = null;

let salesChart = null;

let categoryChart = null;

let transactions = [];

// Auth

async function checkAuth(){

  const ok =
    await window
      .initProtectedPageAuth();

  if(!ok) return false;

  currentUser =
    window.appAuth.user;

  return true;
}

// Helpers

function getEl(id){

  return document.getElementById(id);
}

// Logout

function logout(){

  supabaseClient.auth
    .signOut()
    .finally(() => {

      window.location.href =
        "index.html";
    });
}

// Fetch reports

async function fetchTransactions(){

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

    console.error(error);

    transactions = [];

    return;
  }

  transactions = data || [];
}

// Reports

async function loadReports(){

  await fetchTransactions();

  const start =
    getEl("startDate")?.value;

  const end =
    getEl("endDate")?.value;

  const startDate =

    start

    ? new Date(`${start}T00:00:00`)

    : null;

  const endDate =

    end

    ? new Date(`${end}T23:59:59`)

    : null;

  let filtered =
    transactions.filter(transaction => {

      const date =
        new Date(
          transaction.created_at
        );

      if(startDate && date < startDate)
        return false;

      if(endDate && date > endDate)
        return false;

      return true;
    });

  // Totals

  const totalSales =
    filtered.reduce(
      (sum, transaction) =>

        sum +
        Number(
          transaction.total || 0
        ),

      0
    );

  const totalTransactions =
    filtered.length;

  const totalItems =
    filtered.reduce(
      (sum, transaction) =>

        sum +
        Number(
          transaction.quantity || 0
        ),

      0
    );

  const averageSale =

    totalTransactions

    ? totalSales /
      totalTransactions

    : 0;

  // KPI

  getEl("totalSales")
    .innerText =
      `₱${totalSales.toLocaleString()}`;

  getEl("totalTxns")
    .innerText =
      totalTransactions;

  getEl("avgSale")
    .innerText =
      `₱${averageSale.toFixed(2)}`;

  getEl("totalItems")
    .innerText =
      totalItems;

  // Product performance

  const productMap = {};

  filtered.forEach(transaction => {

    const productName =

      transaction.products?.name ||

      "Unknown Product";

    const categoryName =

      transaction.products
        ?.categories?.name ||

      "Uncategorized";

    const price =
      Number(
        transaction.products?.price || 0
      );

    if(!productMap[productName]){

      productMap[productName] = {

        category:
          categoryName,

        sold: 0,

        revenue: 0,

        avgPrice: price
      };
    }

    productMap[productName]
      .sold += Number(
        transaction.quantity || 0
      );

    productMap[productName]
      .revenue += Number(
        transaction.total || 0
      );
  });

  // Table

  const table =
    getEl("reportTable");

  if(table){

    table.innerHTML = "";

    const sorted =
      Object.entries(productMap)

        .sort(
          (a, b) =>

            b[1].revenue -

            a[1].revenue
        );

    if(sorted.length === 0){

      table.innerHTML = `

        <tr>

          <td colspan="5">

            No data found

          </td>

        </tr>
      `;
    }

    sorted.forEach(([name, data]) => {

      table.innerHTML += `

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

            ₱${data.revenue.toLocaleString()}

          </td>

          <td>

            ₱${data.avgPrice.toFixed(2)}

          </td>

        </tr>
      `;
    });
  }

  // Insights

  const insights =
    getEl("insights");

  if(insights){

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

            Top Product

          </div>

          <div class="insight-value">

            ${sorted[0][0]}

          </div>

        </div>
      `;

      insights.innerHTML += `

        <div class="insight-item">

          <div class="insight-label">

            Top Category

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

          Total Revenue

        </div>

        <div class="insight-value">

          ₱${totalSales.toLocaleString()}

        </div>

      </div>
    `;
  }

  // Sales trend

  const salesByDate = {};

  filtered.forEach(transaction => {

    const date =
      new Date(
        transaction.created_at
      ).toLocaleDateString();

    if(!salesByDate[date]){

      salesByDate[date] = 0;
    }

    salesByDate[date] +=
      Number(
        transaction.total || 0
      );
  });

  const salesLabels =
    Object.keys(salesByDate);

  const salesValues =
    Object.values(salesByDate);

  // Sales chart

  const salesCanvas =
    getEl("salesChart");

  if(salesCanvas){

    if(salesChart){

      salesChart.destroy();
    }

    const gradient =
      salesCanvas
        .getContext("2d")
        .createLinearGradient(
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
      new Chart(salesCanvas, {

        type: "line",

        data: {

          labels:
            salesLabels,

          datasets: [{

            data:
              salesValues,

            borderColor:
              "#8b5cf6",

            backgroundColor:
              gradient,

            fill: true,

            tension: 0.45,

            borderWidth: 3,

            pointRadius: 5,

            pointHoverRadius: 7,

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

  // Category chart

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
      Number(
        transaction.total || 0
      );
  });

  const categoryCanvas =
    getEl("categoryChart");

  if(categoryCanvas){

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
              "#3b82f6"
            ],

            borderWidth: 0
          }]
        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          cutout: "65%",

          plugins: {

            legend: {

              position: "bottom"
            }
          }
        }
      });
  }
}

// Init

window.addEventListener(
  "load",
  async () => {

    const ok =
      await checkAuth();

    if(!ok) return;

    await loadReports();

    lucide.createIcons();
  }
);