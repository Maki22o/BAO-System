const supabaseClient =
  window.appSupabase;

/* =========================================================
   GLOBAL STATE
========================================================= */

let backups = [];

let restoreTarget = null;
let deleteTarget = null;

let creatingBackup = false;
let restoringBackup = false;
let refreshingBackups = false;

/* =========================================================
   HELPERS
========================================================= */

function getEl(id){

  return document.getElementById(id);
}

function formatBytes(bytes){

  if(!bytes) return "0 MB";

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function generateBackupName(){

  const now =
    new Date();

  return `backup-${now.toISOString()}.json`;
}

/* =========================================================
   AUTO DAILY BACKUP
========================================================= */

function getTodayBackupKey(){

  return new Date()
    .toISOString()
    .split("T")[0];
}

function shouldRunAutoBackup(){

  const lastBackup =
    localStorage.getItem(
      "lastAutoBackup"
    );

  return lastBackup !==
    getTodayBackupKey();
}

function markAutoBackupComplete(){

  localStorage.setItem(

    "lastAutoBackup",

    getTodayBackupKey()
  );
}

async function runAutoBackup(){

  try{

    if(!shouldRunAutoBackup()){

      console.log(
        "Daily backup already completed"
      );

      return;
    }

    console.log(
      "Running automatic daily backup..."
    );

    await createBackup({

      silent: true,
      automatic: true
    });

    markAutoBackupComplete();

    console.log(
      "Automatic backup completed"
    );

  }catch(error){

    console.error(

      "AUTO BACKUP ERROR:",

      error
    );
  }
}

/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  type = "success"
){

  const container =
    getEl("toastContainer");

  if(!container) return;

  const toast =
    document.createElement("div");

  toast.className =
    `toast ${type}`;

  toast.innerText =
    message;

  container.appendChild(toast);

  requestAnimationFrame(() => {

    toast.classList.add(
      "show"
    );
  });

  setTimeout(() => {

    toast.classList.remove(
      "show"
    );

    setTimeout(() => {

      toast.remove();

    }, 250);

  }, 2600);
}

/* =========================================================
   GLOBAL LOADER
========================================================= */

function showLoader(
  title = "Processing...",
  message = "Please wait..."
){

  const loader =
    getEl("globalLoader");

  if(!loader) return;

  getEl("loaderTitle").innerText =
    title;

  getEl("loaderMessage").innerText =
    message;

  loader.classList.remove(
    "hidden"
  );
}

function hideLoader(){

  const loader =
    getEl("globalLoader");

  if(!loader) return;

  loader.classList.add(
    "hidden"
  );
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
   FETCH BACKUPS
========================================================= */

async function fetchBackups({

  silent = false

} = {}){

  if(refreshingBackups){

    return;
  }

  refreshingBackups = true;

  try{

    if(!silent){

      renderLoading();
    }

    const { data, error } =
      await supabaseClient

        .from("backup_versions")

        .select("*")

        .order("created_at", {

          ascending: false
        });

    if(error){

      throw error;
    }

    backups = [...(data || [])];

    renderBackups();

    updateBackupStats();

  }catch(error){

    console.error(
      "FETCH BACKUPS ERROR:",
      error
    );

    backups = [];

    renderEmpty();

    showToast(

      error.message ||
      "Unable to load backups",

      "error"
    );

  }finally{

    refreshingBackups = false;
  }
}

/* =========================================================
   REFRESH
========================================================= */

async function refreshBackups(){

  const button =
    getEl("refreshBackupBtn");

  try{

    if(button){

      button.disabled = true;

      button.innerHTML = `

        <i data-lucide="loader-circle"></i>

        <span>
          Refreshing...
        </span>
      `;

      lucide.createIcons();
    }

    await fetchBackups();

    showToast(
      "Backup list refreshed"
    );

  }finally{

    if(button){

      button.disabled = false;

      button.innerHTML = `

        <i data-lucide="refresh-cw"></i>

        <span>
          Refresh
        </span>
      `;

      lucide.createIcons();
    }
  }
}

/* =========================================================
   CREATE BACKUP
========================================================= */

async function createBackup({

  silent = false,
  automatic = false

} = {}){

  if(creatingBackup){

    return;
  }

  creatingBackup = true;

  const button =
    getEl("createBackupBtn");

  try{

    if(!silent){

      showLoader(

        "Creating Backup",
        "Collecting and securing system data..."
      );
    }

    if(button){

      button.disabled = true;

      button.innerHTML = `

        <i data-lucide="loader-circle"></i>

        <span>
          Creating...
        </span>
      `;

      lucide.createIcons();
    }

    const [

      profiles,
      products,
      categories,
      transactions,
      notifications,
      logs

    ] = await Promise.all([

      supabaseClient
        .from("profiles")
        .select("*"),

      supabaseClient
        .from("products")
        .select("*"),

      supabaseClient
        .from("categories")
        .select("*"),

      supabaseClient
        .from("transactions")
        .select("*"),

      supabaseClient
        .from("notifications")
        .select("*"),

      supabaseClient
        .from("logs")
        .select("*")
    ]);

    const errors = [

      profiles.error,
      products.error,
      categories.error,
      transactions.error,
      notifications.error,
      logs.error

    ].filter(Boolean);

    if(errors.length){

      console.error(errors);

      throw new Error(
        "Unable to fetch system data"
      );
    }

    const payload = {

      created_at:
        new Date().toISOString(),

      version:
        `v-${Date.now()}`,

      created_by:
        window.appAuth.user.id,

      data: {

        profiles:
          profiles.data || [],

        products:
          products.data || [],

        categories:
          categories.data || [],

        transactions:
          transactions.data || [],

        notifications:
          notifications.data || [],

        logs:
          logs.data || []
      }
    };

    const json =
      JSON.stringify(
        payload,
        null,
        2
      );

    const blob =
      new Blob([json], {

        type:
          "application/json"
      });

    const fileName =
      generateBackupName();

    const { error:uploadError } =
      await supabaseClient.storage

        .from("backups")

        .upload(
          fileName,
          blob,
          {
            upsert: false,
            contentType:
              "application/json"
          }
        );

    if(uploadError){

      console.error(
        "UPLOAD ERROR:",
        uploadError
      );

      throw uploadError;
    }

    const { error:metaError } =
      await supabaseClient

        .from("backup_versions")

        .insert([{

          file_name:
            fileName,

          size_kb:
            (
              blob.size / 1024
            ).toFixed(2),

          status:
            automatic

            ? "automatic"

            : "manual"
        }]);

    if(metaError){

      console.error(
        "METADATA ERROR:",
        metaError
      );

      throw metaError;
    }

    await rotateBackups();

    await createLog(

      automatic

      ? `Automatic backup created ${fileName}`

      : `Created backup ${fileName}`
    );

    await fetchBackups({

      silent: true
    });

    if(!automatic){

      showToast(
        "Backup created successfully"
      );
    }

  }catch(error){

    console.error(
      "CREATE BACKUP ERROR:",
      error
    );

    showToast(

      error.message ||
      "Unable to create backup",

      "error"
    );

  }finally{

    creatingBackup = false;

    if(!silent){

      hideLoader();
    }

    if(button){

      button.disabled = false;

      button.innerHTML = `

        <i data-lucide="plus"></i>

        <span>
          Create Backup
        </span>
      `;

      lucide.createIcons();
    }
  }
}

/* =========================================================
   ROTATION
========================================================= */

async function rotateBackups(){

  try{

    const { data } =
      await supabaseClient

        .from("backup_versions")

        .select("*")

        .order("created_at", {

          ascending: false
        });

    if(!data || data.length <= 3){

      return;
    }

    const old =
      data.slice(3);

    for(const item of old){

      await supabaseClient.storage

        .from("backups")

        .remove([
          item.file_name
        ]);

      await supabaseClient

        .from("backup_versions")

        .delete()

        .eq("id", item.id);
    }

  }catch(error){

    console.error(
      "ROTATION ERROR:",
      error
    );
  }
}

/* =========================================================
   RENDER LOADING
========================================================= */

function renderLoading(){

  const table =
    getEl("backupTable");

  if(!table) return;

  table.innerHTML = `

    <tr>

      <td colspan="5" class="table-loading">

        <div class="loading-wrapper">

          <div class="spinner"></div>

          <div>

            <h4>
              Loading backups...
            </h4>

            <p>
              Synchronizing backup history.
            </p>

          </div>

        </div>

      </td>

    </tr>
  `;
}

/* =========================================================
   RENDER EMPTY
========================================================= */

function renderEmpty(){

  const empty =
    getEl("emptyState");

  if(empty){

    empty.classList.remove(
      "hidden"
    );
  }

  const table =
    getEl("backupTable");

  if(table){

    table.innerHTML = "";
  }
}

/* =========================================================
   RENDER BACKUPS
========================================================= */

function renderBackups(){

  const table =
    getEl("backupTable");

  const empty =
    getEl("emptyState");

  if(!table) return;

  table.innerHTML = "";

  if(backups.length === 0){

    renderEmpty();

    return;
  }

  if(empty){

    empty.classList.add(
      "hidden"
    );
  }

  const rows = backups.map((backup,index) => {

    const isAutomatic =
      backup.status ===
      "automatic";

    return `

      <tr>

        <td>

          <span class="version-badge">

            v${index + 1}

          </span>

        </td>

        <td>

          ${
            new Date(
              backup.created_at
            ).toLocaleString()
          }

        </td>

        <td>

          ${backup.size_kb} KB

        </td>

        <td>

          <span class="status-badge success">

            <span></span>

            ${
              isAutomatic

              ? "automatic"

              : "manual"
            }

          </span>

        </td>

        <td>

          <div class="action-buttons">

            <button
              class="table-btn download"
              onclick="downloadBackup('${backup.file_name}')"
            >

              <i data-lucide="download"></i>

            </button>

            <button
              class="table-btn restore"
              onclick="openRestoreModal('${backup.file_name}')"
            >

              <i data-lucide="rotate-ccw"></i>

            </button>

            <button
              class="table-btn delete"
              onclick="openDeleteModal('${backup.id}','${backup.file_name}')"
            >

              <i data-lucide="trash-2"></i>

            </button>

          </div>

        </td>

      </tr>
    `;
  });

  table.innerHTML =
    rows.join("");

  lucide.createIcons();
}

/* =========================================================
   UPDATE STATS
========================================================= */

function updateBackupStats(){

  getEl("totalBackups").innerText =
    backups.length;

  getEl("latestBackup").innerText =

    backups.length > 0

    ? new Date(
        backups[0].created_at
      ).toLocaleDateString()

    : "No Data";

  const totalBytes =
    backups.reduce(
      (sum, backup) =>

        sum +
        (
          Number(
            backup.size_kb
          ) * 1024
        ),

      0
    );

  getEl("storageUsed").innerText =
    formatBytes(totalBytes);
}

/* =========================================================
   DOWNLOAD
========================================================= */

async function downloadBackup(fileName){

  try{

    showLoader(

      "Downloading Backup",
      "Preparing secure download..."
    );

    const { data, error } =
      await supabaseClient.storage

        .from("backups")

        .download(fileName);

    if(error){

      throw error;
    }

    const url =
      URL.createObjectURL(data);

    const a =
      document.createElement("a");

    a.href = url;

    a.download = fileName;

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

    showToast(
      "Backup downloaded"
    );

  }catch(error){

    console.error(
      "DOWNLOAD ERROR:",
      error
    );

    showToast(
      "Unable to download backup",
      "error"
    );

  }finally{

    hideLoader();
  }
}

/* =========================================================
   RESTORE MODAL
========================================================= */

function openRestoreModal(fileName){

  restoreTarget =
    fileName;

  const modal =
    getEl("restoreModal");

  if(modal){

    modal.classList.remove(
      "hidden"
    );
  }

  getEl("confirmRestoreBtn")
    .onclick =
      confirmRestore;
}

function closeRestoreModal(){

  restoreTarget = null;

  const modal =
    getEl("restoreModal");

  if(modal){

    modal.classList.add(
      "hidden"
    );
  }
}

/* =========================================================
   RESTORE
========================================================= */

async function confirmRestore(){

  if(
    !restoreTarget ||
    restoringBackup
  ){

    return;
  }

  restoringBackup = true;

  try{

    showLoader(

      "Restoring Backup",
      "Recovering inventory and system data..."
    );

    const { data, error } =
      await supabaseClient.storage

        .from("backups")

        .download(
          restoreTarget
        );

    if(error){

      throw error;
    }

    const text =
      await data.text();

    const backup =
      JSON.parse(text);

    if(
      !backup ||
      !backup.data
    ){

      throw new Error(
        "Invalid backup file"
      );
    }

    console.log(
      "RESTORE PAYLOAD:",
      backup
    );

    await createLog(
      `Restored backup ${restoreTarget}`
    );

    showToast(
      "Backup restored successfully"
    );

    closeRestoreModal();

  }catch(error){

    console.error(
      "RESTORE ERROR:",
      error
    );

    showToast(

      error.message ||
      "Restore failed",

      "error"
    );

  }finally{

    restoringBackup = false;

    hideLoader();
  }
}

/* =========================================================
   DELETE MODAL
========================================================= */

function openDeleteModal(
  id,
  fileName
){

  deleteTarget = {

    id,
    fileName
  };

  getEl("deleteModal")
    .classList.remove(
      "hidden"
    );

  getEl("confirmDeleteBtn")
    .onclick =
      confirmDeleteBackup;
}

function closeDeleteModal(){

  deleteTarget = null;

  getEl("deleteModal")
    .classList.add(
      "hidden"
    );
}

/* =========================================================
   DELETE
========================================================= */

async function confirmDeleteBackup(){

  if(!deleteTarget){

    return;
  }

  try{

    showLoader(

      "Deleting Backup",
      "Removing backup snapshot..."
    );

    const { error:storageError } =
      await supabaseClient.storage

        .from("backups")

        .remove([
          deleteTarget.fileName
        ]);

    if(storageError){

      throw storageError;
    }

    const { error:dbError } =
      await supabaseClient

        .from("backup_versions")

        .delete()

        .eq(
          "id",
          deleteTarget.id
        );

    if(dbError){

      throw dbError;
    }

    await createLog(

      `Deleted backup ${deleteTarget.fileName}`
    );

    await fetchBackups({

      silent: true
    });

    closeDeleteModal();

    showToast(
      "Backup deleted"
    );

  }catch(error){

    console.error(
      "DELETE ERROR:",
      error
    );

    showToast(
      "Unable to delete backup",
      "error"
    );

  }finally{

    hideLoader();
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
          window.appAuth.user.id,

        text
      }]);

  }catch(error){

    console.error(
      "LOG ERROR:",
      error
    );
  }
}

/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(() => {

  fetchBackups({

    silent: true
  });

}, 15000);

/* =========================================================
   INIT
========================================================= */

window.addEventListener(
  "load",
  async () => {

    try{

      const ok =
        await window
          .initProtectedPageAuth();

      if(!ok) return;

      if(
        !window.isAdminRole(
          window.appAuth.role
        )
      ){

        window.location.href =
          "dashboard.html";

        return;
      }

      await fetchBackups();

      await runAutoBackup();

      lucide.createIcons();

      console.log(
        "Backup system initialized"
      );

    }catch(error){

      console.error(
        "INIT ERROR:",
        error
      );

      showToast(
        "Backup system failed to initialize",
        "error"
      );
    }
  }
);