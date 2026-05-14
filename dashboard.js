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

let products = [];

let transactions = [];

let notifications = [];

let barChartInstance = null;

let pieChartInstance = null;

// Theme

function updateThemeIcon(isLight){

  const themeIcon =
    document.getElementById(
      "themeIcon"
    );

  if(!themeIcon) return;

  themeIcon.innerHTML = isLight

    ? '<i data-lucide="sun"></i>'

    : '<i data-lucide="moon"></i>';

  lucide.createIcons();
}

function initTheme(){

  const savedTheme =
    localStorage.getItem(
      "theme"
    );

  const isLight =
    savedTheme === "light";

  if(isLight){

    document.body.classList.add(
      "light-mode"
    );
  }

  updateThemeIcon(isLight);

  const toggle =
    document.getElementById(
      "themeToggle"
    );

  if(!toggle) return;

  toggle.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "light-mode"
      );

      const light =
        document.body.classList.contains(
          "light-mode"
        );

      localStorage.setItem(
        "theme",
        light
          ? "light"
          : "dark"
      );

      updateThemeIcon(light);
    }
  );
}

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

// User info

function loadUserInfo(){

  const fullName =

    window.appAuth.profile
      ?.fullname ||

    currentUser?.email ||

    "User";

  const roleLabel =
    window.appAuth.roleLabel;

  // Name

  document.querySelectorAll(
    "#userName"
  ).forEach(el => {

    el.innerText =
      fullName;
  });

  // Role

  document.querySelectorAll(
    "#userRole"
  ).forEach(el => {

    el.innerText =
      roleLabel;
  });

  // Avatar

  document.querySelectorAll(
    "#userInitial"
  ).forEach(el => {

    el.innerText =

      String(fullName)
        .trim()
        .charAt(0)
        .toUpperCase();
  });
}

// Logout

async function logout(){

  await supabaseClient.auth
    .signOut();

  window.location.href =
    "index.html";
}

// Sidebar

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

// Notifications

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

// Fetch products

async function fetchProducts(){

  const { data, error } =
    await supabaseClient

      .from("products")

      .select(`
        *,
        categories (
          id,
          name
        )
      `)

      .order("created_at", {

        ascending: false
      });

  if(error){

    console.error(error);

    products = [];

    return;
  }

  products = data || [];
}

// Fetch transactions

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
          categories (
            id,
            name
          )
        )
      `)

      .order("created_at", {

        ascending: false
      });

  if(error){

    console.error(error);

    transactions = [];

    return;
  }

  transactions = data || [];
}

// Fetch notifications

async function fetchNotifications(){

  const { data, error } =
    await supabaseClient

      .from("notifications")

      .select("*")

      .order("created_at", {

        ascending: false
      });

  if(error){

    console.error(error);

    notifications = [];

    return;
  }

  notifications = data || [];
}

// Stats

function getTotalSales(){

  return transactions.reduce(
    (sum, transaction) =>

      sum +
      Number(
        transaction.total || 0
      ),

    0
  );
}

function getTotalItemsSold(){

  return transactions.reduce(
    (sum, transaction) =>

      sum +
      Number(
        transaction.quantity || 0
      ),

    0
  );
}

function getTodaySales(){

  const today =
    new Date().toDateString();

  return transactions.reduce(
    (sum, transaction) => {

      const date =
        new Date(
          transaction.created_at
        ).toDateString();

      return date === today

        ? sum +
          Number(
            transaction.total || 0
          )

        : sum;

    }, 0
  );
}

// Dashboard stats

function updateDashboardStats(){

  const totalProducts =
    products.length;

  const lowStock =
    products.filter(product =>

      Number(product.quantity) <= 5
    ).length;

  const totalValue =
    products.reduce(
      (sum, product) =>

        sum +

        (
          Number(product.price) *
          Number(product.quantity)
        ),

      0
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
    `₱${totalValue.toLocaleString()}`;

  document.getElementById(
    "totalSales"
  ).innerText =
    `₱${getTotalSales().toLocaleString()}`;

  document.getElementById(
    "totalItemsSold"
  ).innerText =
    getTotalItemsSold();

  document.getElementById(
    "dailySales"
  ).innerText =
    `₱${getTodaySales().toLocaleString()}`;
}

// Charts

function loadBarChart(){

  const canvas =
    document.getElementById(
      "barChart"
    );

  if(!canvas) return;

  if(barChartInstance){

    barChartInstance.destroy();
  }

  barChartInstance =
    new Chart(canvas, {

      type: "bar",

      data: {

        labels:
          products.map(product =>

            product.name
          ),

        datasets: [{

          data:
            products.map(product =>

              Number(
                product.quantity
              )
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

function loadPieChart(){

  const canvas =
    document.getElementById(
      "pieChart"
    );

  if(!canvas) return;

  if(pieChartInstance){

    pieChartInstance.destroy();
  }

  const categoryMap = {};

  products.forEach(product => {

    const category =

      product.categories?.name ||

      "Uncategorized";

    categoryMap[category] =

      (
        categoryMap[category] || 0
      ) +

      Number(product.quantity);
  });

  pieChartInstance =
    new Chart(canvas, {

      type: "doughnut",

      data: {

        labels:
          Object.keys(categoryMap),

        datasets: [{

          data:
            Object.values(categoryMap),

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

// Low stock

function renderLowStock(){

  const container =
    document.getElementById(
      "lowStockList"
    );

  if(!container) return;

  const low =
    products.filter(product =>

      Number(product.quantity) <= 5
    );

  container.innerHTML = "";

  if(low.length === 0){

    container.innerHTML =
      "<p>No low stock items</p>";

    return;
  }

  low.forEach(product => {

    const quantity =
      Number(product.quantity);

    container.innerHTML += `

      <div class="stock">

        ${product.name}

        <div class="bar">

          <span
            style="
              width:
              ${Math.min(quantity * 10,100)}%
            "
          ></span>

        </div>

      </div>
    `;
  });
}

// Activity

function renderActivity(){

  const container =
    document.getElementById(
      "recentActivity"
    );

  if(!container) return;

  container.innerHTML = "";

  transactions.slice(0,5)
    .forEach(transaction => {

      container.innerHTML += `

        <div class="txn">

          ${
            transaction.products?.name ||

            "Unknown Product"
          }

          sold

          <span>

            ${
              transaction.quantity
            } pcs →

            ${
              transaction.buyer ||
              "N/A"
            }

          </span>

        </div>
      `;
    });
}

// Notifications

function renderNotifications(){

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

  notifications.forEach(notification => {

    list.innerHTML += `

      <div class="notif-item">

        <div class="notif-icon">

          <i data-lucide="bell"></i>

        </div>

        <div class="notif-content">

          <div class="notif-title">

            ${notification.title}

          </div>

          <div class="notif-desc">

            ${
              notification.description ||
              ""
            }

          </div>

        </div>

      </div>
    `;
  });

  lucide.createIcons();
}

// Clear notifications

async function clearNotif(){

  await supabaseClient

    .from("notifications")

    .delete();

  notifications = [];

  renderNotifications();

  showToast(
    "Notifications cleared"
  );
}

// Toast

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

// Refresh

async function refreshDashboardData(){

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

// Init

window.addEventListener(
  "load",
  async () => {

    initTheme();

    const ok =
      await checkAuth();

    if(!ok) return;

    loadUserInfo();

    await refreshDashboardData();

    setTimeout(() => {

      showToast(

        `Welcome back, ${
          window.appAuth.profile
            ?.fullname ||

          currentUser?.email ||

          "User"
        }`
      );

    }, 800);

    lucide.createIcons();
  }
);