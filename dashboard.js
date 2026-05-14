/* =========================================
   SUPABASE CONFIG
========================================= */

const SUPABASE_URL =
  "https://dpdchbusvfktlqjaxdlb.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

/* =========================================
   GLOBALS
========================================= */

let currentUser = null;

let barChartInstance;
let pieChartInstance;

/* =========================================
   THEME ICON
========================================= */

function updateThemeIcon(isLight){

  const themeIcon =
    document.getElementById(
      "themeIcon"
    );

  if(!themeIcon) return;

  themeIcon.innerHTML = isLight

  ? `

    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >

      <circle cx="12" cy="12" r="5"></circle>

      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>

      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>

      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>

      <line x1="1" y1="12" x2="3" y2="12"></line>

      <line x1="21" y1="12" x2="23" y2="12"></line>

    </svg>

  `

  : `

    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >

      <path d="M12 3a6 6 0 1 0 9 9 9 9 0 1 1-9-9z"></path>

    </svg>

  `;
}

/* =========================================
   THEME SYSTEM
========================================= */

function initTheme(){

  const savedTheme =
    localStorage.getItem("theme");

  const isLight =
    savedTheme === "light";

  if(isLight){

    document.body.classList.add(
      "light-mode"
    );
  }

  updateThemeIcon(isLight);

  const themeToggle =
    document.getElementById(
      "themeToggle"
    );

  if(themeToggle){

    themeToggle.addEventListener(
      "click",
      () => {

        document.body.classList.toggle(
          "light-mode"
        );

        const lightMode =
          document.body.classList.contains(
            "light-mode"
          );

        localStorage.setItem(
          "theme",
          lightMode
            ? "light"
            : "dark"
        );

        updateThemeIcon(lightMode);

      }
    );
  }
}

/* =========================================
   AUTH CHECK
========================================= */

async function checkAuth(){

  try{

    const { data, error } =
      await supabaseClient.auth.getSession();

    if(error){

      console.error(error);

      window.location.href =
        "index.html";

      return;
    }

    const session =
      data?.session;

    if(!session){

      window.location.href =
        "index.html";

      return;
    }

    currentUser = session.user;

    loadUserInfo();

  }catch(error){

    console.error(error);

    window.location.href =
      "index.html";
  }
}

/* =========================================
   LOAD USER INFO
========================================= */

function loadUserInfo(){

  const userName =
    document.getElementById(
      "userName"
    );

  if(!userName || !currentUser)
    return;

  const fullName =
    currentUser.user_metadata
      ?.fullname;

  userName.innerText =
    fullName ||
    currentUser.email ||
    "User";
}

/* =========================================
   LOGOUT
========================================= */

async function logout(){

  await supabaseClient.auth.signOut();

  window.location.href =
    "index.html";
}

/* =========================================
   MOBILE SIDEBAR
========================================= */

function toggleSidebar(){

  const sidebar =
    document.getElementById(
      "sidebar"
    );

  const overlay =
    document.getElementById(
      "sidebarOverlay"
    );

  if(!sidebar || !overlay)
    return;

  sidebar.classList.toggle(
    "show"
  );

  overlay.classList.toggle(
    "show"
  );
}

/* =========================================
   DATA
========================================= */

function getProducts(){

  return JSON.parse(
    localStorage.getItem(
      "products"
    )
  ) || [];
}

function getTransactions(){

  return JSON.parse(
    localStorage.getItem(
      "transactions"
    )
  ) || [];
}

function getNotifications(){

  return JSON.parse(
    localStorage.getItem(
      "notifications"
    )
  ) || [];
}

/* =========================================
   SALES
========================================= */

function getTotalSales(){

  const txns =
    getTransactions();

  return txns.reduce(
    (sum, txn) =>

      sum +
      Number(txn.total || 0),

    0
  );
}

function getTotalItemsSold(){

  const txns =
    getTransactions();

  return txns.reduce(
    (sum, txn) => {

      if(txn.items){

        return (
          sum +
          txn.items.reduce(
            (s, item) =>

              s +
              Number(item.qty || 0),

            0
          )
        );
      }

      return (
        sum +
        Number(txn.qty || 0)
      );

    }, 0
  );
}

function getTodaySales(){

  const txns =
    getTransactions();

  const today =
    new Date().toDateString();

  return txns.reduce(
    (sum, txn) => {

      const txnDate =
        new Date(
          txn.date
        ).toDateString();

      return txnDate === today

        ? sum +
          Number(txn.total || 0)

        : sum;

    }, 0
  );
}

/* =========================================
   CHART SETTINGS
========================================= */

Chart.defaults.color =
  "#94a3b8";

Chart.defaults.borderColor =
  "rgba(255,255,255,0.08)";

/* =========================================
   DASHBOARD STATS
========================================= */

function updateDashboardStats(){

  const products =
    getProducts();

  const totalProducts =
    products.length;

  const lowStock =
    products.filter(
      product =>
        Number(product.qty) <= 5
    ).length;

  const totalValue =
    products.reduce(
      (sum, product) => {

        const price =
          Number(
            String(product.price)
            .replace(/[^\d]/g, "")
          ) || 0;

        const qty =
          Number(product.qty) || 0;

        return (
          sum +
          (price * qty)
        );

      }, 0
    );

  document.getElementById(
    "totalProducts"
  ).innerText =
    totalProducts;

  document.getElementById(
    "lowStock"
  ).innerText =
    lowStock;

  document.getElementById(
    "totalValue"
  ).innerText =
    "₱" +
    totalValue.toLocaleString();

  document.getElementById(
    "totalSales"
  ).innerText =
    "₱" +
    getTotalSales()
    .toLocaleString();

  document.getElementById(
    "totalItemsSold"
  ).innerText =
    getTotalItemsSold();

  document.getElementById(
    "dailySales"
  ).innerText =
    "₱" +
    getTodaySales()
    .toLocaleString();
}

/* =========================================
   BAR CHART
========================================= */

function loadBarChart(){

  const canvas =
    document.getElementById(
      "barChart"
    );

  if(!canvas) return;

  const products =
    getProducts();

  if(barChartInstance){

    barChartInstance.destroy();
  }

  barChartInstance =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels:
          products.map(
            product =>
              product.name
          ),

        datasets: [{

          data:
            products.map(
              product =>
                Number(
                  product.qty
                ) || 0
            ),

          backgroundColor:
            "#6366f1",

          borderRadius: 8
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

            ticks: {
              display: false
            },

            grid: {
              display: false
            }
          },

          y: {

            beginAtZero: true
          }
        }
      }
    });
}

/* =========================================
   PIE CHART
========================================= */

function loadPieChart(){

  const canvas =
    document.getElementById(
      "pieChart"
    );

  if(!canvas) return;

  const products =
    getProducts();

  const categoryMap = {};

  products.forEach(product => {

    const qty =
      Number(product.qty) || 0;

    categoryMap[
      product.category
    ] =
      (categoryMap[
        product.category
      ] || 0) + qty;
  });

  if(pieChartInstance){

    pieChartInstance.destroy();
  }

  pieChartInstance =
    new Chart(canvas, {

      type: "doughnut",

      data: {

        labels:
          Object.keys(
            categoryMap
          ),

        datasets: [{

          data:
            Object.values(
              categoryMap
            ),

          backgroundColor: [

            "#6366f1",
            "#22c55e",
            "#f59e0b",
            "#ef4444"
          ],

          borderWidth: 0
        }]
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {

            position: "bottom"
          }
        },

        cutout: "68%"
      }
    });
}

/* =========================================
   LOW STOCK
========================================= */

function renderLowStock(){

  const container =
    document.getElementById(
      "lowStockList"
    );

  if(!container) return;

  const lowStockProducts =
    getProducts().filter(
      product =>
        Number(product.qty) <= 5
    );

  container.innerHTML = "";

  if(lowStockProducts.length === 0){

    container.innerHTML =
      "<p>No low stock items</p>";

    return;
  }

  lowStockProducts.forEach(
    product => {

      const qty =
        Number(product.qty) || 0;

      container.innerHTML += `

        <div class="stock">

          ${product.name}

          <div class="bar">

            <span
              style="
                width:
                ${Math.min(qty * 10,100)}%
              "
            ></span>

          </div>

        </div>
      `;
    }
  );
}

/* =========================================
   RECENT ACTIVITY
========================================= */

function renderActivity(){

  const container =
    document.getElementById(
      "recentActivity"
    );

  if(!container) return;

  const txns =
    getTransactions();

  container.innerHTML = "";

  txns.slice(0, 5)
  .forEach(txn => {

    container.innerHTML += `

      <div class="txn">

        ${txn.name} sold

        <span>

          ${txn.qty} pcs
          →
          ${txn.buyer || "N/A"}

        </span>

      </div>
    `;
  });
}

/* =========================================
   NOTIFICATIONS
========================================= */

function toggleNotif(){

  const panel =
    document.getElementById(
      "notifPanel"
    );

  if(panel){

    panel.classList.toggle(
      "show"
    );
  }
}

function renderNotifications(){

  const notifications =
    getNotifications();

  const list =
    document.getElementById(
      "notifList"
    );

  const badge =
    document.getElementById(
      "notifDot"
    );

  if(!list || !badge)
    return;

  list.innerHTML = "";

  if(notifications.length === 0){

    list.innerHTML = `

      <div class="notif-empty">
        No notifications
      </div>
    `;

    badge.style.display =
      "none";

    return;
  }

  badge.style.display =
    "flex";

  badge.innerText =
    notifications.length;

  notifications.forEach(
    notification => {

      list.innerHTML += `

        <div class="notif-item">

          <div class="notif-icon">

            ${
              notification.icon ||
              "🔔"
            }

          </div>

          <div class="notif-content">

            <div class="notif-title">

              ${notification.title}

            </div>

            <div class="notif-desc">

              ${notification.desc}

            </div>

          </div>

        </div>
      `;
    }
  );
}

function clearNotif(){

  localStorage.removeItem(
    "notifications"
  );

  renderNotifications();

  renderActivity();

  showToast(
    "Notifications cleared"
  );
}

/* =========================================
   TOAST
========================================= */

function showToast(message){

  const toast =
    document.createElement(
      "div"
    );

  toast.className =
    "toast";

  toast.innerText =
    message;

  document.body.appendChild(
    toast
  );

  setTimeout(() => {

    toast.classList.add(
      "show"
    );

  }, 100);

  setTimeout(() => {

    toast.remove();

  }, 3000);
}

/* =========================================
   AUTO UPDATE
========================================= */

window.addEventListener(
  "storage",
  () => {

    updateDashboardStats();

    loadBarChart();

    loadPieChart();

    renderNotifications();

    renderLowStock();

    renderActivity();
  }
);

/* =========================================
   INITIALIZATION
========================================= */

window.addEventListener(
  "load",
  async () => {

    initTheme();

    await checkAuth();

    updateDashboardStats();

    loadBarChart();

    loadPieChart();

    renderNotifications();

    renderLowStock();

    renderActivity();

    setTimeout(() => {

      showToast(

        `Welcome back, ${
          currentUser?.user_metadata
            ?.fullname ||

          currentUser?.email ||

          "User"
        } 👋`
      );

    }, 800);
  }
);