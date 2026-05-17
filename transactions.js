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

let allTransactions = [];

let filteredData = [];

let currentIndex = 0;

const batchSize = 20;

// Toast

function showToast(message){

  const toast =
    document.getElementById(
      "toast"
    );

  if(!toast) return;

  toast.innerText =
    message;

  toast.style.display =
    "block";

  setTimeout(() => {

    toast.style.display =
      "none";

  }, 2200);
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

// Fetch transactions

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

      throw error;
    }

    allTransactions =

      (data || [])

      .map(transaction => ({

        id:
          transaction.id,

        product:
          transaction.products?.name ||

          "Unknown Product",

        category:

          transaction.products
            ?.categories?.name ||

          "Uncategorized",

        buyer:
          transaction.buyer ||

          "N/A",

        quantity:
          Number(
            transaction.quantity || 0
          ),

        total:
          Number(
            transaction.total || 0
          ),

        date:
          transaction.created_at
      }))

      .sort(

        (a, b) =>

          new Date(b.date) -

          new Date(a.date)
      );

  }catch(error){

    console.error(error);

    allTransactions = [];

    showToast(
      "Unable to load transactions"
    );
  }
}

// Category filter

function loadCategoriesFilter(){

  const filter =
    document.getElementById(
      "filter"
    );

  if(!filter) return;

  const current =
    filter.value;

  const unique = [

    ...new Set(

      allTransactions.map(
        transaction =>
          transaction.category
      )
    )
  ];

  filter.innerHTML = `

    <option value="All">

      All Categories

    </option>
  `;

  unique.forEach(category => {

    filter.innerHTML += `

      <option value="${category}">

        ${category}

      </option>
    `;
  });

  if(
    current &&
    [...filter.options]
      .some(option =>

        option.value === current
      )
  ){

    filter.value = current;
  }
}

// Date

function formatDate(date){

  return new Date(date)
    .toLocaleDateString();
}

function formatTime(date){

  return new Date(date)
    .toLocaleTimeString();
}

// Reset render

function resetAndRender(){

  currentIndex = 0;

  const body =
    document.getElementById(
      "tableBody"
    );

  if(body){

    body.innerHTML = "";
  }

  renderTable();
}

// Render table

function renderTable(){

  const search =
    document.getElementById(
      "search"
    )?.value.toLowerCase() || "";

  const filter =
    document.getElementById(
      "filter"
    )?.value || "All";

  const from =
    document.getElementById(
      "dateFrom"
    )?.value;

  const to =
    document.getElementById(
      "dateTo"
    )?.value;

  filteredData =
    allTransactions.filter(transaction => {

      const matchSearch =

        transaction.product
          .toLowerCase()
          .includes(search);

      const matchFilter =

        filter === "All" ||

        transaction.category === filter;

      const transactionDate =
        new Date(transaction.date);

      let matchDate = true;

      if(from){

        matchDate =
          transactionDate >=
          new Date(from);
      }

      if(to){

        matchDate =

          matchDate &&

          transactionDate <=
          new Date(`${to}T23:59:59`);
      }

      return (

        matchSearch &&
        matchFilter &&
        matchDate
      );
    });

  loadMore();
}

// Infinite scroll

function loadMore(){

  const body =
    document.getElementById(
      "tableBody"
    );

  const empty =
    document.getElementById(
      "emptyState"
    );

  if(!body || !empty)
    return;

  const nextData =
    filteredData.slice(

      currentIndex,

      currentIndex + batchSize
    );

  if(filteredData.length === 0){

    empty.style.display =
      "block";

    return;
  }

  empty.style.display =
    "none";

  nextData.forEach(transaction => {

    body.innerHTML += `

      <tr>

        <td>

          ${transaction.id}

        </td>

        <td>

          ${transaction.product}

        </td>

        <td>

          ${transaction.category}

        </td>

        <td>

          ${transaction.buyer}

        </td>

        <td>

          ${transaction.quantity}

        </td>

        <td>

          ₱${transaction.total.toLocaleString()}

        </td>

        <td>

          ${formatDate(transaction.date)}

        </td>

        <td>

          ${formatTime(transaction.date)}

        </td>

      </tr>
    `;
  });

  currentIndex += batchSize;
}

// Logout

async function logout(){

  await supabaseClient.auth
    .signOut();

  window.location.href =
    "index.html";
}

// Scroll

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const container =
      document.getElementById(
        "tableContainer"
      );

    if(container){

      container.addEventListener(
        "scroll",
        () => {

          if(

            container.scrollTop +

            container.clientHeight >=

            container.scrollHeight - 10
          ){

            loadMore();
          }
        }
      );
    }
  }
);

// Init

window.addEventListener(
  "load",
  async () => {

    const ok =
      await checkAuth();

    if(!ok) return;

    await fetchTransactions();

    loadCategoriesFilter();

    resetAndRender();

    // Backup RBAC

    const backupLink =
      document.getElementById(
        "backupLink"
      );

    if(backupLink){

      backupLink.style.display =

        window.appAuth.role ===
        "admin_user"

        ? ""

        : "none";
    }

    lucide.createIcons();
  }
);