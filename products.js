let currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

if (currentUser.role !== "admin") {
  let adminLink = document.querySelector('a[href="admin.html"]');
  if (adminLink) adminLink.style.display = "none";
}

let products = JSON.parse(localStorage.getItem("products")) || [];
let selectedIndex = null;
let editIndex = null;

/* ================= LOAD PRODUCTS ================= */
function loadProducts() {
  let raw = JSON.parse(localStorage.getItem("products")) || [];

  products = raw.map(p => ({
    id: p.id ?? Date.now(),
    name: p.name ?? p.productName ?? "Unnamed",
    category: p.category ?? "Uncategorized",
    qty: Number(p.qty ?? p.quantity ?? 0),
    price: Number(String(p.price).replace(/[^\d]/g, "")) || 0
  }));

  localStorage.setItem("products", JSON.stringify(products));

  renderTable();
}

/* ================= LOAD CATEGORIES ================= */
function loadCategoriesDropdown() {
  let categories = JSON.parse(localStorage.getItem("categories")) || [];

  let select = document.getElementById("category");
  let filter = document.getElementById("filter");

  if (select) {
    select.innerHTML = "";
    categories.forEach(cat => {
      select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
  }

  if (filter) {
    filter.innerHTML = `<option value="All">All Categories</option>`;
    categories.forEach(cat => {
      filter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
  }
}

/* ================= CATEGORY FILTER ================= */
function applySelectedCategory() {
  let selected = localStorage.getItem("selectedCategory");

  if (selected) {
    let filter = document.getElementById("filter");
    if (filter) filter.value = selected;
    localStorage.removeItem("selectedCategory");
  }
}

/* ================= NOTIFICATION ================= */
function pushNotification(icon, title, desc) {
  let notifications = JSON.parse(localStorage.getItem("notifications")) || [];

  notifications.unshift({
    icon,
    title,
    desc,
    time: new Date().toISOString()
  });

  localStorage.setItem("notifications", JSON.stringify(notifications));
}

/* ================= SELL ================= */
function sellProduct(i) {
  selectedIndex = i;
  document.getElementById("sellModal").style.display = "flex";
}

function closeSell() {
  document.getElementById("sellModal").style.display = "none";
  document.getElementById("buyer").value = "";
  document.getElementById("sellQty").value = "";
}

/* ================= CONFIRM SELL ================= */
function confirmSell() {
  let buyer = document.getElementById("buyer").value.trim();
  let qty = parseInt(document.getElementById("sellQty").value);

  if (!buyer || isNaN(qty) || qty <= 0) {
    return showToast("Fill all fields properly");
  }

  let product = products[selectedIndex];
  if (!product) return;

  if (qty > product.qty) {
    return showToast("Not enough stock");
  }

  product.qty -= qty;

  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  let total = product.price * qty;

  // 🔥 FIX APPLIED HERE
  transactions.unshift({
    name: product.name,
    category: product.category, // ✅ FIX
    qty,
    total,
    buyer,
    date: new Date().toISOString()
  });

  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("products", JSON.stringify(products));

  showToast("Transaction completed");
  pushNotification("🛒", "Product sold", `${product.name} → ${buyer}`);

  closeSell();
  loadProducts();
}

/* ================= EDIT PRODUCT ================= */
function openEdit(index) {
  let p = products[index];
  if (!p) return;

  editIndex = index;

  document.getElementById("modalTitle").innerText = "Edit Product";
  document.getElementById("name").value = p.name;
  document.getElementById("category").value = p.category;
  document.getElementById("qty").value = p.qty;
  document.getElementById("price").value = p.price;

  document.getElementById("modal").style.display = "flex";
}

/* ================= RENDER ================= */
function renderTable() {
  let search = document.getElementById("search")?.value.toLowerCase() || "";
  let filter = document.getElementById("filter")?.value || "All";

  let body = document.getElementById("tableBody");
  body.innerHTML = "";

  products.forEach((p, i) => {

    if (!p.name.toLowerCase().includes(search)) return;
    if (filter !== "All" && p.category !== filter) return;

    let qty = Number(p.qty);
    let price = Number(p.price);

    let statusText = "";
    let badgeClass = "";

    if (qty === 0) {
      statusText = "Out of Stock";
      badgeClass = "red";
    } else if (qty <= 5) {
      statusText = "Low Stock";
      badgeClass = "yellow";
    } else {
      statusText = "In Stock";
      badgeClass = "green";
    }

    body.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${qty}</td>
        <td>₱${price.toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>

        <td>
          <div class="actions">
            <button class="btn edit" onclick="openEdit(${i})">✏️</button>
            <button class="btn sell" onclick="sellProduct(${i})">🛒</button>
            <button class="btn delete" onclick="del(${p.id})">🗑</button>
          </div>
        </td>
      </tr>
    `;
  });
}

/* ================= ADD / UPDATE PRODUCT ================= */
function saveProduct() {
  let name = document.getElementById("name").value.trim();
  let category = document.getElementById("category").value;
  let qty = parseInt(document.getElementById("qty").value);
  let price = parseFloat(document.getElementById("price").value);

  if (!name || isNaN(qty) || isNaN(price)) {
    return showToast("Fill all fields properly");
  }

  if (editIndex !== null) {
    products[editIndex] = {
      ...products[editIndex],
      name,
      category,
      qty,
      price
    };
    showToast("Product updated");
    editIndex = null;
  } else {
    products.push({
      id: Date.now(),
      name,
      category,
      qty,
      price
    });
    showToast("Product added");
  }

  localStorage.setItem("products", JSON.stringify(products));

  closeModal();
  resetForm();
  loadProducts();
}

/* ================= DELETE ================= */
function del(id) {
  if (!confirm("Delete this product?")) return;

  products = products.filter(p => p.id !== id);
  localStorage.setItem("products", JSON.stringify(products));

  showToast("Deleted");
  loadProducts();
}

/* ================= RESET FORM ================= */
function resetForm() {
  document.getElementById("name").value = "";
  document.getElementById("category").selectedIndex = 0;
  document.getElementById("qty").value = "";
  document.getElementById("price").value = "";
}

/* ================= UI ================= */
function openAdd() {
  editIndex = null;
  document.getElementById("modalTitle").innerText = "Add Product";
  document.getElementById("modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

/* ================= TOAST ================= */
function showToast(msg) {
  let t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2000);
}

/* ================= LOGOUT ================= */
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

/* ================= INIT ================= */
window.addEventListener("load", () => {
  loadCategoriesDropdown();
  applySelectedCategory();
  loadProducts();
});