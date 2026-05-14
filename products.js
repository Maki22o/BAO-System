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

let selectedProductId = null;

let editingProductId = null;

// UUID

function isUuid(value){

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || ""));
}

// Toast

function showToast(message){

  const toast =
    document.getElementById(
      "toast"
    );

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

    categories = [];

    return;
  }

  categories = data || [];

  loadCategoriesDropdown();
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

    showToast(
      "Unable to load products"
    );

    return;
  }

  products = data || [];

  renderTable();
}

// Load dropdown

function loadCategoriesDropdown(){

  const category =
    document.getElementById(
      "category"
    );

  const filter =
    document.getElementById(
      "filter"
    );

  if(category){

    category.innerHTML = "";

    categories.forEach(cat => {

      category.innerHTML += `

        <option value="${cat.id}">

          ${cat.name}

        </option>
      `;
    });
  }

  if(filter){

    filter.innerHTML = `
      <option value="All">
        All Categories
      </option>
    `;

    categories.forEach(cat => {

      filter.innerHTML += `

        <option value="${cat.id}">

          ${cat.name}

        </option>
      `;
    });
  }
}

// Render table

function renderTable(){

  const body =
    document.getElementById(
      "tableBody"
    );

  if(!body) return;

  const search =
    document.getElementById(
      "search"
    )?.value.toLowerCase() || "";

  const filter =
    document.getElementById(
      "filter"
    )?.value || "All";

  const filtered =
    products.filter(product => {

      const matchSearch =
        product.name
          ?.toLowerCase()
          .includes(search);

      const matchFilter =

        filter === "All" ||

        String(product.category_id) ===
        String(filter);

      return (
        matchSearch &&
        matchFilter
      );
    });

  if(filtered.length === 0){

    body.innerHTML = `

      <tr>

        <td colspan="7"
            class="table-empty">

          No products found

        </td>

      </tr>
    `;

    return;
  }

  body.innerHTML =
    filtered.map(product => {

      const quantity =
        Number(product.quantity);

      const price =
        Number(product.price);

      const status =

        quantity === 0

        ? ["Out of Stock", "red"]

        : quantity <= 5

        ? ["Low Stock", "yellow"]

        : ["In Stock", "green"];

      return `

        <tr>

          <td>
            ${product.id}
          </td>

          <td>
            ${product.name}
          </td>

          <td>
            ${
              product.categories?.name ||
              "Uncategorized"
            }
          </td>

          <td>
            ${quantity}
          </td>

          <td>
            ₱${price.toLocaleString()}
          </td>

          <td>

            <span class="badge ${status[1]}">

              ${status[0]}

            </span>

          </td>

          <td>

            <div class="actions">

              <button
                class="btn edit"
                onclick="openEdit('${product.id}')"
              >

                Edit

              </button>

              <button
                class="btn sell"
                onclick="sellProduct('${product.id}')"
              >

                Sell

              </button>

              <button
                class="btn delete"
                onclick="del('${product.id}')"
              >

                Delete

              </button>

            </div>

          </td>

        </tr>
      `;
    }).join("");
}

// Open modal

function openAdd(){

  editingProductId = null;

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Add Product";

  resetForm();

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

// Reset form

function resetForm(){

  document.getElementById(
    "name"
  ).value = "";

  document.getElementById(
    "qty"
  ).value = "";

  document.getElementById(
    "price"
  ).value = "";
}

// Close modal

function closeModal(){

  document.getElementById(
    "modal"
  ).style.display =
    "none";
}

// Open edit

function openEdit(id){

  const product =
    products.find(product =>

      String(product.id) ===
      String(id)
    );

  if(!product) return;

  editingProductId =
    product.id;

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Edit Product";

  document.getElementById(
    "name"
  ).value =
    product.name;

  document.getElementById(
    "category"
  ).value =
    product.category_id;

  document.getElementById(
    "qty"
  ).value =
    product.quantity;

  document.getElementById(
    "price"
  ).value =
    product.price;

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

// Save product

async function saveProduct(){

  const name =
    document.getElementById(
      "name"
    ).value.trim();

  const categoryId =
    document.getElementById(
      "category"
    ).value;

  const quantity =
    Number.parseInt(

      document.getElementById(
        "qty"
      ).value,

      10
    );

  const price =
    Number.parseFloat(

      document.getElementById(
        "price"
      ).value
    );

  if(
    !name ||
    Number.isNaN(quantity) ||
    Number.isNaN(price)
  ){

    return showToast(
      "Fill all fields"
    );
  }

  if(!isUuid(categoryId)){

    return showToast(
      "Invalid category"
    );
  }

  const payload = {

    name,

    category_id:
      categoryId,

    quantity,

    price,

    created_by:
      currentUser.id
  };

  try{

    if(editingProductId){

      const { error } =
        await supabaseClient

          .from("products")

          .update(payload)

          .eq(
            "id",
            editingProductId
          );

      if(error) throw error;

      showToast(
        "Product updated"
      );

    }else{

      const { error } =
        await supabaseClient

          .from("products")

          .insert([payload]);

      if(error) throw error;

      showToast(
        "Product added"
      );
    }

    closeModal();

    await fetchProducts();

  }catch(error){

    console.error(error);

    showToast(

      error?.message ||

      "Unable to save product"
    );
  }
}

// Delete

async function del(id){

  if(!confirm(
    "Delete this product?"
  )) return;

  try{

    const { error } =
      await supabaseClient

        .from("products")

        .delete()

        .eq("id", id);

    if(error) throw error;

    showToast(
      "Product deleted"
    );

    await fetchProducts();

  }catch(error){

    console.error(error);

    showToast(
      "Unable to delete product"
    );
  }
}

// Sell

function sellProduct(id){

  selectedProductId = id;

  document.getElementById(
    "sellModal"
  ).style.display =
    "flex";
}

// Close sell

function closeSell(){

  document.getElementById(
    "sellModal"
  ).style.display =
    "none";

  document.getElementById(
    "buyer"
  ).value = "";

  document.getElementById(
    "sellQty"
  ).value = "";
}

// Confirm sell

async function confirmSell(){

  const buyer =
    document.getElementById(
      "buyer"
    ).value.trim();

  const quantity =
    Number.parseInt(

      document.getElementById(
        "sellQty"
      ).value,

      10
    );

  if(
    !buyer ||
    Number.isNaN(quantity)
  ){

    return showToast(
      "Fill all fields"
    );
  }

  const product =
    products.find(product =>

      String(product.id) ===
      String(selectedProductId)
    );

  if(!product){

    return showToast(
      "Product not found"
    );
  }

  if(quantity > product.quantity){

    return showToast(
      "Not enough stock"
    );
  }

  try{

    const remaining =
      product.quantity -
      quantity;

    // Update stock

    const { error:updateError } =
      await supabaseClient

        .from("products")

        .update({

          quantity: remaining
        })

        .eq(
          "id",
          product.id
        );

    if(updateError)
      throw updateError;

    // Insert transaction

    await supabaseClient

      .from("transactions")

      .insert([{

        product_id:
          product.id,

        quantity,

        total:
          quantity *
          product.price,

        buyer,

        created_by:
          currentUser.id
      }]);

    // Notification

    await supabaseClient

      .from("notifications")

      .insert([{

        title:
          "Product sold",

        description:
          `${product.name} → ${buyer}`,

        created_by:
          currentUser.id
      }]);

    showToast(
      "Transaction completed"
    );

    closeSell();

    await fetchProducts();

  }catch(error){

    console.error(error);

    showToast(
      "Unable to complete sale"
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

// Init

window.addEventListener(
  "load",
  async () => {

    const ok =
      await checkAuth();

    if(!ok) return;

    await fetchCategories();

    await fetchProducts();
  }
);
