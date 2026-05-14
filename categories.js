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

let categories = [];

let products = [];

let editingCategoryId = null;

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

  }, 2300);
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

// Fetch categories

async function fetchCategories(){

  const { data, error } =
    await supabaseClient

      .from("categories")

      .select("*")

      .order("created_at", {

        ascending: false
      });

  if(error){

    console.error(error);

    showToast(
      "Unable to load categories"
    );

    categories = [];

    return;
  }

  categories = data || [];
}

// Fetch products

async function fetchProducts(){

  const { data, error } =
    await supabaseClient

      .from("products")

      .select("*");

  if(error){

    console.error(error);

    products = [];

    return;
  }

  products = data || [];
}

// Render table

function renderTable(){

  const body =
    document.getElementById(
      "tableBody"
    );

  const empty =
    document.getElementById(
      "emptyState"
    );

  const search =
    document.getElementById(
      "searchCat"
    )?.value.toLowerCase() || "";

  if(!body || !empty)
    return;

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

  filtered.forEach(category => {

    const count =
      products.filter(product =>

        String(product.category_id) ===
        String(category.id)

      ).length;

    body.innerHTML += `

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
}

// Open modal

function openAdd(){

  editingCategoryId = null;

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Add Category";

  document.getElementById(
    "name"
  ).value = "";

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

// Close modal

function closeModal(){

  document.getElementById(
    "modal"
  ).style.display =
    "none";
}

// View category

function viewCategory(categoryId){

  localStorage.setItem(

    "selectedCategoryId",

    String(categoryId)
  );

  window.location.href =
    "products.html";
}

// Edit

function edit(id){

  const category =
    categories.find(category =>

      String(category.id) ===
      String(id)
    );

  if(!category) return;

  editingCategoryId =
    category.id;

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Edit Category";

  document.getElementById(
    "name"
  ).value =
    category.name;

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

// Create

async function createCategory(name){

  const { error } =
    await supabaseClient

      .from("categories")

      .insert([{

        name,

        created_by:
          currentUser.id
      }]);

  if(error){

    console.error(error);

    throw error;
  }
}

// Update

async function updateCategory(id, name){

  const { error } =
    await supabaseClient

      .from("categories")

      .update({

        name
      })

      .eq("id", id);

  if(error){

    console.error(error);

    throw error;
  }
}

// Save

async function saveCategory(){

  const name =
    document.getElementById(
      "name"
    ).value.trim();

  if(!name){

    return showToast(
      "Enter category"
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

  try{

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

    await refreshData();

  }catch(error){

    console.error(error);

    showToast(

      error?.message ||

      "Unable to save category"
    );
  }
}

// Delete

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

    const { error } =
      await supabaseClient

        .from("categories")

        .delete()

        .eq("id", id);

    if(error){

      throw error;
    }

    showToast(
      "Category deleted"
    );

    await refreshData();

  }catch(error){

    console.error(error);

    showToast(
      "Unable to delete category"
    );
  }
}

// Logout

async function logout(){

  await supabaseClient.auth
    .signOut();

  window.location.href =
    "index.html";
}

// Refresh

async function refreshData(){

  await fetchCategories();

  await fetchProducts();

  renderTable();
}

// Init

window.addEventListener(
  "load",
  async () => {

    const ok =
      await checkAuth();

    if(!ok) return;

    await refreshData();

    lucide.createIcons();
  }
);