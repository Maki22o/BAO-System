const supabaseClient =
  window.appSupabase;

let currentUser = null;

let categories = [];

let products = [];

let selectedProductId = null;

let editingProductId = null;

let uploadedFile = null;

let uploadedImageUrl = "";

let savingProduct = false;

let sellingProduct = false;

let isUploading = false;

/* =========================================
   TOAST
========================================= */

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

/* =========================================
   UUID
========================================= */

function isUuid(value){

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || ""));
}

/* =========================================
   AUTH
========================================= */

async function checkAuth(){

  if(
    typeof window
      .initProtectedPageAuth !==
    "function"
  ){

    console.error(
      "Auth helper missing"
    );

    return false;
  }

  const ok =
    await window
      .initProtectedPageAuth();

  if(!ok) return false;

  currentUser =
    window.appAuth.user;

  return true;
}

/* =========================================
   UPLOAD IMAGE
========================================= */

async function uploadImage(file){

  if(!file) return null;

  const validTypes = [

    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif"
  ];

  if(
    !validTypes.includes(file.type)
  ){

    showToast(
      "Invalid image format"
    );

    return null;
  }

  if(file.size > 5 * 1024 * 1024){

    showToast(
      "Image exceeds 5MB"
    );

    return null;
  }

  const saveButton =
    document.getElementById(
      "saveProductBtn"
    );

  isUploading = true;

  if(saveButton){

    saveButton.disabled = true;

    saveButton.innerText =
      "Uploading...";
  }

  try{

    const fileName =
      `${Date.now()}-${file.name}`;

    const { error } =
      await supabaseClient.storage

        .from("product-images")

        .upload(
          fileName,
          file,
          {
            upsert: true,
            contentType: file.type
          }
        );

    if(error){

      console.error(
        "Upload error:",
        error
      );

      throw error;
    }

    const { data } =
      supabaseClient.storage

        .from("product-images")

        .getPublicUrl(fileName);

    if(
      !data ||
      !data.publicUrl
    ){

      throw new Error(
        "Unable to generate image URL"
      );
    }

    return data.publicUrl;

  }catch(error){

    console.error(error);

    showToast(
      error.message ||
      "Image upload failed"
    );

    return null;

  }finally{

    isUploading = false;

    if(saveButton){

      saveButton.disabled = false;

      saveButton.innerText =
        "Save Product";
    }
  }
}

/* =========================================
   PREVIEW IMAGE
========================================= */

function previewImage(event){

  const file =
    event.target.files[0];

  if(!file) return;

  uploadedFile = file;

  uploadedImageUrl = "";

  const img =
    document.getElementById(
      "previewImg"
    );

  const placeholder =
    document.getElementById(
      "previewPlaceholder"
    );

  const status =
    document.getElementById(
      "uploadStatus"
    );

  const statusText =
    document.getElementById(
      "uploadStatusText"
    );

  const reader =
    new FileReader();

  reader.onload =
    function(e){

      img.src =
        e.target.result;

      img.style.display =
        "block";

      placeholder.style.display =
        "none";

      if(status){

        status.style.display =
          "flex";

        status.className =
          "upload-status";

        statusText.innerText =
          "Image ready for upload";
      }
    };

  reader.onerror =
    function(){

      showToast(
        "Unable to preview image"
      );
    };

  reader.readAsDataURL(file);
}

/* =========================================
   FETCH CATEGORIES
========================================= */

async function fetchCategories(){

  const { data, error } =
    await supabaseClient

      .from("categories")

      .select("*")

      .order("name", {

        ascending: true
      });

  if(error){

    console.error(error);

    categories = [];

    return;
  }

  categories = data || [];

  loadCategoriesDropdown();
}

/* =========================================
   FETCH PRODUCTS
========================================= */

async function fetchProducts(){

  const body =
    document.getElementById(
      "tableBody"
    );

  if(body){

    body.innerHTML = `

      <tr>

        <td colspan="7"
            class="table-empty">

          Loading products...

        </td>

      </tr>
    `;
  }

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

/* =========================================
   DROPDOWNS
========================================= */

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

/* =========================================
   RENDER PRODUCTS
========================================= */

function renderTable(){

  const body =
    document.getElementById(
      "tableBody"
    );

  if(!body) return;

  const search =
    document.getElementById(
      "search"
    )?.value
      .toLowerCase() || "";

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

  const html =
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

            ${
              product.image_url
              ? `
                <img
                  src="${product.image_url}"
                  class="product-image"
                  loading="lazy"
                  alt="${product.name}"
                >
              `
              : `
                <div class="product-image-placeholder">

                  <i data-lucide="image"></i>

                </div>
              `
            }

          </td>

          <td>

            <strong>

              ${product.name}

            </strong>

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

  body.innerHTML = html;

  lucide.createIcons();
}

/* =========================================
   OPEN ADD
========================================= */

function openAdd(){

  editingProductId = null;

  resetForm();

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Add Product";

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

/* =========================================
   RESET FORM
========================================= */

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

  document.getElementById(
    "productImage"
  ).value = "";

  uploadedFile = null;

  uploadedImageUrl = "";

  const img =
    document.getElementById(
      "previewImg"
    );

  const placeholder =
    document.getElementById(
      "previewPlaceholder"
    );

  const status =
    document.getElementById(
      "uploadStatus"
    );

  img.src = "";

  img.style.display =
    "none";

  placeholder.style.display =
    "flex";

  if(status){

    status.style.display =
      "none";
    }
}

/* =========================================
   CLOSE MODAL
========================================= */

function closeModal(){

  document.getElementById(
    "modal"
  ).style.display =
    "none";
}

/* =========================================
   OPEN EDIT
========================================= */

function openEdit(id){

  const product =
    products.find(product =>

      String(product.id) ===
      String(id)
    );

  if(!product){

    showToast(
      "Product not found"
    );

    return;
  }

  editingProductId =
    product.id;

  uploadedImageUrl =
    product.image_url || "";

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

  const img =
    document.getElementById(
      "previewImg"
    );

  const placeholder =
    document.getElementById(
      "previewPlaceholder"
    );

  if(product.image_url){

    img.src =
      product.image_url;

    img.style.display =
      "block";

    placeholder.style.display =
      "none";
  }

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

/* =========================================
   SAVE PRODUCT
========================================= */

async function saveProduct(){

  if(
    savingProduct ||
    isUploading
  ){

    return;
  }

  savingProduct = true;

  const saveBtn =
    document.getElementById(
      "saveProductBtn"
    );

  if(saveBtn){

    saveBtn.disabled = true;

    saveBtn.innerText =
      "Saving...";
  }

  try{

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

      throw new Error(
        "Please complete all fields"
      );
    }

    if(!isUuid(categoryId)){

      throw new Error(
        "Invalid category selected"
      );
    }

    let imageUrl =
      uploadedImageUrl;

    // Upload during save

    if(uploadedFile){

      imageUrl =
        await uploadImage(
          uploadedFile
        );

      if(!imageUrl){

        throw new Error(
          "Image upload failed"
        );
      }
    }

    const payload = {

      name,

      category_id:
        categoryId,

      quantity,

      price,

      image_url:
        imageUrl || null,

      created_by:
        currentUser.id
    };

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

      await supabaseClient

        .from("logs")

        .insert([{

          created_by:
            currentUser.id,

          text:
            `Updated product: ${name}`

        }]);

      showToast(
        "Product updated"
      );

    }else{

      const { error } =
        await supabaseClient

          .from("products")

          .insert([payload]);

      if(error) throw error;

      await supabaseClient

        .from("logs")

        .insert([{

          created_by:
            currentUser.id,

          text:
            `Added product: ${name}`

        }]);

      showToast(
        "Product added"
      );
    }

    closeModal();

    resetForm();

    await fetchProducts();

  }catch(error){

    console.error(error);

    showToast(
      error.message ||
      "Failed to save product"
    );

  }finally{

    savingProduct = false;

    if(saveBtn){

      saveBtn.disabled = false;

      saveBtn.innerText =
        "Save Product";
    }
  }
}

/* =========================================
   DELETE PRODUCT
========================================= */

async function del(id){

  const confirmed =
    confirm(
      "Delete this product?"
    );

  if(!confirmed) return;

  try{

    await supabaseClient

      .from("products")

      .delete()

      .eq("id", id);

    showToast(
      "Product deleted"
    );

    await fetchProducts();

  }catch(error){

    console.error(error);

    showToast(
      "Delete failed"
    );
  }
}

/* =========================================
   SELL PRODUCT
========================================= */

function sellProduct(id){

  selectedProductId = id;

  document.getElementById(
    "sellModal"
  ).style.display =
    "flex";
}

/* =========================================
   CLOSE SELL
========================================= */

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

/* =========================================
   CONFIRM SELL
========================================= */

async function confirmSell(){

  if(sellingProduct){

    return;
  }

  sellingProduct = true;

  try{

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

      throw new Error(
        "Please complete all fields"
      );
    }

    const product =
      products.find(product =>

        String(product.id) ===
        String(selectedProductId)
      );

    if(!product){

      throw new Error(
        "Product not found"
      );
    }

    if(quantity > product.quantity){

      throw new Error(
        "Not enough stock"
      );
    }

    const remaining =
      product.quantity -
      quantity;

    await supabaseClient

      .from("products")

      .update({

        quantity:
          remaining

      })

      .eq(
        "id",
        product.id
      );

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

    await supabaseClient

      .from("logs")

      .insert([{

        created_by:
          currentUser.id,

        text:
          `Sold ${quantity}x ${product.name}`
      }]);

    // Receipt

    document.getElementById(
      "receiptContent"
    ).innerHTML = `

      <div class="receipt-row">

        <span>Product:</span>

        <strong>${product.name}</strong>

      </div>

      <div class="receipt-row">

        <span>Buyer:</span>

        <strong>${buyer}</strong>

      </div>

      <div class="receipt-row">

        <span>Quantity:</span>

        <strong>${quantity}</strong>

      </div>

      <div class="receipt-row">

        <span>Total:</span>

        <strong>

          ₱${(
            quantity *
            product.price
          ).toLocaleString()}

        </strong>

      </div>

      <div class="receipt-row">

        <span>Date:</span>

        <strong>

          ${new Date()
            .toLocaleString()}

        </strong>

      </div>
    `;

    document.getElementById(
      "receiptModal"
    ).style.display =
      "flex";

    showToast(
      "Transaction completed"
    );

    closeSell();

    await fetchProducts();

  }catch(error){

    console.error(error);

    showToast(
      error.message ||
      "Sell failed"
    );

  }finally{

    sellingProduct = false;
  }
}

/* =========================================
   RECEIPT
========================================= */

function printReceipt(){

  window.print();
}

function closeReceipt(){

  document.getElementById(
    "receiptModal"
  ).style.display =
    "none";
}

/* =========================================
   LOGOUT
========================================= */

async function logout(){

  await supabaseClient.auth
    .signOut();

  window.location.href =
    "index.html";
}

/* =========================================
   INIT
========================================= */

async function init(){

  const authenticated =
    await checkAuth();

  if(!authenticated) return;

  await fetchCategories();

  await fetchProducts();

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

  console.log(
    "Products page initialized successfully"
  );
}

window.addEventListener(
  "DOMContentLoaded",
  init
);