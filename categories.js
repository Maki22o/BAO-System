let currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

// Hide admin if not admin
if (currentUser.role !== "admin") {
  let adminLink = document.querySelector('a[href="admin.html"]');
  if (adminLink) adminLink.style.display = "none";
}

let categories = JSON.parse(localStorage.getItem("categories")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];

let editIndex = null;

/* ================= SAVE ================= */
function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));
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

/* ================= RENDER ================= */
function renderTable() {
  let body = document.getElementById("tableBody");
  let empty = document.getElementById("emptyState");
  let search = document.getElementById("searchCat")?.value.toLowerCase() || "";

  body.innerHTML = "";

  categories = JSON.parse(localStorage.getItem("categories")) || [];
  products = JSON.parse(localStorage.getItem("products")) || [];

  let filtered = categories.filter(cat =>
    cat.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    empty.style.display = "block";
    return;
  } else {
    empty.style.display = "none";
  }

  filtered.forEach((cat, i) => {
    let count = products.filter(p => p.category === cat).length;

    body.innerHTML += `
      <tr>
        <td onclick="viewCategory('${cat}')">
          ${cat}
        </td>

        <td>${count}</td>

        <td class="actions">

          <button class="btn edit" onclick="edit(${i})">
            ✏️ Edit
          </button>

          <button class="btn delete" onclick="del(${i})">
            🗑 Delete
          </button>

        </td>
      </tr>
    `;
  });

  saveCategories();
}

/* ================= VIEW CATEGORY ================= */
function viewCategory(cat) {
  // ✅ save selected category for products page
  localStorage.setItem("selectedCategory", cat);

  pushNotification("📂", "Viewing category", cat);

  // ✅ redirect
  window.location.href = "products.html";
}

/* ================= ADD / EDIT ================= */
function openAdd() {
  editIndex = null;
  document.getElementById("name").value = "";
  document.getElementById("modal").style.display = "flex";
}

function saveCategory() {
  let name = document.getElementById("name").value.trim();

  if (!name) return showToast("Enter category");

  if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
    return showToast("Category already exists");
  }

  if (editIndex !== null) {
    let old = categories[editIndex];

    // ✅ update products using this category
    products.forEach(p => {
      if (p.category === old) {
        p.category = name;
      }
    });

    localStorage.setItem("products", JSON.stringify(products));

    categories[editIndex] = name;

    pushNotification("✏️", "Category updated", `${old} → ${name}`);

  } else {
    categories.push(name);

    pushNotification("📁", "Category added", name);
  }

  saveCategories();
  closeModal();
  renderTable();
}

/* ================= EDIT ================= */
function edit(i) {
  editIndex = i;
  document.getElementById("name").value = categories[i];
  document.getElementById("modal").style.display = "flex";
}

/* ================= DELETE ================= */
function del(i) {
  let name = categories[i];

  let usedProducts = products.filter(p => p.category === name);

  if (usedProducts.length > 0) {
    return showToast(`Cannot delete. Used by ${usedProducts.length} products`);
  }

  if (!confirm(`Delete "${name}" category?`)) return;

  categories.splice(i, 1);

  pushNotification("🗑️", "Category deleted", name);

  saveCategories();
  renderTable();
}

/* ================= UI ================= */
function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function showToast(msg) {
  let t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2000);
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

/* ================= SYNC ================= */
window.addEventListener("storage", () => {
  location.reload();
});

/* ================= INIT ================= */
window.addEventListener("load", () => {
  renderTable();
});