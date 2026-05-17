const supabaseClient =
  window.appSupabase;

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;

let categories = [];
let products = [];

let editingCategoryId = null;

let isRefreshing = false;

/* =========================================================
   HELPERS
========================================================= */

function getEl(id){

  return document.getElementById(id);
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message){

  const toast =
    getEl("toast");

  if(!toast) return;

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

/* =========================================================
   AUTH
========================================================= */

async function checkAuth(){

  const ok =
    await window
      .initProtectedPageAuth();

  if(!ok) return false;

  currentUser =
    window.appAuth.user;

  return true;
}

/* =========================================================
   FETCH CATEGORIES
========================================================= */

async function fetchCategories(){

  try{

    const { data, error } =
      await supabaseClient

        .from("categories")

        .select("*")

        .order("created_at", {

          ascending: false
        });

    if(error){

      throw error;
    }

    categories = [...(data || [])];

  }catch(error){

    console.error(error);

    categories = [];

    showToast(
      "Unable to load categories"
    );
  }
}

/* =========================================================
   FETCH PRODUCTS
========================================================= */

async function fetchProducts(){

  try{

    const { data, error } =
      await supabaseClient

        .from("products")

        .select("*");

    if(error){

      throw error;
    }

    products = [...(data || [])];

  }catch(error){

    console.error(error);

    products = [];

    showToast(
      "Unable to load products"
    );
  }
}

/* =========================================================
   REFRESH DATA
========================================================= */

async function refreshData({

  silent = false,
  force = false

} = {}){

  if(isRefreshing && !force){

    return;
  }

  isRefreshing = true;

  const refreshBtn =
    document.querySelector(
      ".control-btn"
    );

  try{

    if(refreshBtn){

      refreshBtn.disabled = true;

      refreshBtn.classList.add(
        "loading"
      );
    }

    if(!silent){

      const body =
        getEl("tableBody");

      if(body){

        body.innerHTML = `

          <tr>

            <td colspan="3">

              Loading categories...

            </td>

          </tr>
        `;
      }
    }

    await Promise.all([

      fetchCategories(),
      fetchProducts()

    ]);

    renderTable();

  }catch(error){

    console.error(error);

    showToast(
      "Refresh failed"
    );

  }finally{

    isRefreshing = false;

    if(refreshBtn){

      refreshBtn.disabled = false;

      refreshBtn.classList.remove(
        "loading"
      );
    }
  }
}

/* =========================================================
   RENDER TABLE
========================================================= */

function renderTable(){

  const body =
    getEl("tableBody");

  const empty =
    getEl("emptyState");

  const search =
    getEl("searchCat")
      ?.value
      ?.toLowerCase()
      ?.trim() || "";

  if(!body || !empty) return;

  body.innerHTML = "";

  const filtered =
    categories.filter(category =>

      category.name
        ?.toLowerCase()
        .includes(search)
    );

  if(filtered.length === 0){

    empty.style.display =
      "block";

    return;
  }

  empty.style.display =
    "none";

  const rows = filtered.map(category => {

    const count =
      products.filter(product =>

        String(product.category_id) ===
        String(category.id)

      ).length;

    return `

      <tr>

        <td onclick="viewCategory('${category.id}')">

          ${category.name}

        </td>

        <td>

          ${count}

        </td>

        <td class="actions">

          <button
            class="btn edit"
            onclick="edit('${category.id}')"
          >

            Edit

          </button>

          <button
            class="btn delete"
            onclick="del('${category.id}')"
          >

            Delete

          </button>

        </td>

      </tr>
    `;
  });

  body.innerHTML =
    rows.join("");

  lucide.createIcons();
}

/* =========================================================
   OPEN MODAL
========================================================= */

function openAdd(){

  editingCategoryId = null;

  getEl("modalTitle")
    .innerText =
      "Add Category";

  getEl("name").value = "";

  getEl("modal").style.display =
    "flex";
}

/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal(){

  getEl("modal").style.display =
    "none";
}

/* =========================================================
   VIEW CATEGORY
========================================================= */

function viewCategory(categoryId){

  localStorage.setItem(

    "selectedCategoryId",

    String(categoryId)
  );

  window.location.href =
    "products.html";
}

/* =========================================================
   EDIT
========================================================= */

function edit(id){

  const category =
    categories.find(category =>

      String(category.id) ===
      String(id)
    );

  if(!category) return;

  editingCategoryId =
    category.id;

  getEl("modalTitle")
    .innerText =
      "Edit Category";

  getEl("name").value =
    category.name;

  getEl("modal").style.display =
    "flex";
}

/* =========================================================
   CREATE CATEGORY
========================================================= */

async function createCategory(name){

  const payload = {

    name
  };

  if(currentUser?.id){

    payload.created_by =
      currentUser.id;
  }

  const { error } =
    await supabaseClient

      .from("categories")

      .insert([payload]);

  if(error){

    throw error;
  }

  await createLog(
    `Created category ${name}`
  );
}

/* =========================================================
   UPDATE CATEGORY
========================================================= */

async function updateCategory(
  id,
  name
){

  const { error } =
    await supabaseClient

      .from("categories")

      .update({

        name
      })

      .eq("id", id);

  if(error){

    throw error;
  }

  await createLog(
    `Updated category ${name}`
  );
}

/* =========================================================
   SAVE CATEGORY
========================================================= */

async function saveCategory(){

  const name =
    getEl("name")
      .value
      .trim();

  if(!name){

    return showToast(
      "Enter category name"
    );
  }

  const exists =
    categories.some(category =>

      category.name
        ?.toLowerCase() ===
      name.toLowerCase()

      &&

      String(category.id) !==
      String(editingCategoryId)
    );

  if(exists){

    return showToast(
      "Category already exists"
    );
  }

  const saveBtn =
    document.querySelector(
      ".btn.primary"
    );

  try{

    if(saveBtn){

      saveBtn.disabled = true;

      saveBtn.innerText =
        "Saving...";
    }

    if(editingCategoryId){

      await updateCategory(

        editingCategoryId,
        name
      );

      showToast(
        "Category updated"
      );

    }else{

      await createCategory(name);

      showToast(
        "Category added"
      );
    }

    closeModal();

    await refreshData({

      force: true
    });

  }catch(error){

    console.error(error);

    showToast(

      error?.message ||

      "Unable to save category"
    );

  }finally{

    if(saveBtn){

      saveBtn.disabled = false;

      saveBtn.innerText =
        "Save Category";
    }
  }
}

/* =========================================================
   DELETE CATEGORY
========================================================= */

async function del(id){

  const usedCount =
    products.filter(product =>

      String(product.category_id) ===
      String(id)

    ).length;

  if(usedCount > 0){

    return showToast(

      `Cannot delete. Used by ${usedCount} products`
    );
  }

  if(!confirm(
    "Delete this category?"
  )) return;

  try{

    const category =
      categories.find(category =>

        String(category.id) ===
        String(id)
      );

    const { error } =
      await supabaseClient

        .from("categories")

        .delete()

        .eq("id", id);

    if(error){

      throw error;
    }

    await createLog(

      `Deleted category ${category?.name || id}`
    );

    showToast(
      "Category deleted"
    );

    await refreshData({

      force: true
    });

  }catch(error){

    console.error(error);

    showToast(
      "Unable to delete category"
    );
  }
}

/* =========================================================
   AUDIT LOG
========================================================= */

async function createLog(text){

  try{

    await supabaseClient

      .from("logs")

      .insert([{

        created_by:
          currentUser?.id || null,

        text
      }]);

  }catch(error){

    console.error(
      "Log failed:",
      error
    );
  }
}

/* =========================================================
   LOGOUT
========================================================= */

async function logout(){

  await supabaseClient.auth
    .signOut();

  window.location.href =
    "index.html";
}

/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(() => {

  refreshData({

    silent: true
  });

}, 15000);

/* =========================================================
   INIT
========================================================= */

window.addEventListener(
  "load",
  async () => {

    const ok =
      await checkAuth();

    if(!ok) return;

    await refreshData({

      force: true
    });

    // RBAC

    const backupLink =
      getEl("backupLink");

    if(backupLink){

      backupLink.style.display =

        window.appAuth.role ===
        "admin_user"

        ? ""

        : "none";
    }

    lucide.createIcons();

    console.log(
      "Categories initialized successfully"
    );
  }
);