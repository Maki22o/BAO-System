const supabaseClient =
  window.appSupabase;

/* =========================================================
   ENTERPRISE BACKUP SYSTEM
   Production-Grade ZIP Backup Architecture
========================================================= */

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
   CONFIG
========================================================= */

const BACKUP_VERSION =
  "2.0.0";

const MAX_BACKUPS =
  3;

const CHUNK_SIZE =
  500;

const BACKUP_TABLES = [

  "profiles",
  "products",
  "categories",
  "transactions",
  "notifications",
  "logs"
];

/* =========================================================
   HELPERS
========================================================= */

function getEl(id){

  return document.getElementById(id);
}

function delay(ms){

  return new Promise(resolve => {

    setTimeout(resolve, ms);

  });
}

function formatBytes(bytes){

  if(!bytes){

    return "0 MB";
  }

  const mb =
    bytes / 1024 / 1024;

  return `${mb.toFixed(2)} MB`;
}

function generateBackupName(){

  const now =
    new Date();

  const formatted =

    now.getFullYear() + "-" +

    String(
      now.getMonth() + 1
    ).padStart(2,"0") + "-" +

    String(
      now.getDate()
    ).padStart(2,"0") + "_" +

    String(
      now.getHours()
    ).padStart(2,"0") + "-" +

    String(
      now.getMinutes()
    ).padStart(2,"0") + "-" +

    String(
      now.getSeconds()
    ).padStart(2,"0");

  return `bao-backup-${formatted}.zip`;
}

/* =========================================================
   LOADER
========================================================= */

function showLoader(

  title = "Processing...",
  message = "Please wait..."

){

  const loader =
    getEl("globalLoader");

  if(!loader) return;

  getEl("loaderTitle")
    .innerText = title;

  getEl("loaderMessage")
    .innerText = message;

  updateLoaderProgress(0);

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

function updateLoaderProgress(

  percent = 0,
  message = ""

){

  const fill =
    getEl("loaderProgressFill");

  const text =
    getEl("loaderProgressText");

  if(fill){

    fill.style.width =
      `${percent}%`;
  }

  if(text){

    text.innerText =
      `${percent}%`;
  }

  if(message){

    const loaderMessage =
      getEl("loaderMessage");

    if(loaderMessage){

      loaderMessage.innerText =
        message;
    }
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

  }, 3000);
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

    const {

      data,
      error

    } = await supabaseClient

      .from("backup_versions")

      .select("*")

      .order("created_at", {

        ascending:false
      });

    if(error){

      throw error;
    }

    backups =
      data || [];

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

        "Collecting and compressing database records..."
      );
    }

    if(button){

      button.disabled = true;

      button.classList.add(
        "btn-loading"
      );
    }

    const zip =
      new JSZip();

    /* =====================================================
       MANIFEST
    ===================================================== */

    const manifest = {

      backupVersion:
        BACKUP_VERSION,

      app:
        "BAO Storage",

      createdAt:
        new Date().toISOString(),

      createdBy:
        window.appAuth.user.id,

      compression:
        "DEFLATE",

      tables:
        BACKUP_TABLES
    };

    zip.file(

      "manifest.json",

      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    const tablesFolder =
      zip.folder("tables");

    /* =====================================================
       EXPORT TABLES
    ===================================================== */

    for(

      let i = 0;
      i < BACKUP_TABLES.length;
      i++

    ){

      const table =
        BACKUP_TABLES[i];

      const percent =

        Math.floor(
          (
            i /
            BACKUP_TABLES.length
          ) * 60
        );

      updateLoaderProgress(

        percent,

        `Exporting ${table}...`
      );

      const {

        data,
        error

      } = await supabaseClient

        .from(table)

        .select("*");

      if(error){

        throw error;
      }

      tablesFolder.file(

        `${table}.json`,

        JSON.stringify(
          data || [],
          null,
          2
        )
      );

      await delay(100);
    }

    /* =====================================================
       METADATA
    ===================================================== */

    const metadataFolder =
      zip.folder("metadata");

    metadataFolder.file(

      "system.json",

      JSON.stringify({

        generatedAt:
          new Date().toISOString(),

        backupVersion:
          BACKUP_VERSION,

        source:
          "BAO Storage"

      }, null, 2)
    );

    /* =====================================================
       COMPRESS
    ===================================================== */

    updateLoaderProgress(

      75,

      "Compressing backup archive..."
    );

    const blob =
      await zip.generateAsync({

        type:"blob",

        compression:"DEFLATE",

        compressionOptions:{
          level:9
        }
      });

    const fileName =
      generateBackupName();

    /* =====================================================
       UPLOAD
    ===================================================== */

    updateLoaderProgress(

      90,

      "Uploading backup archive..."
    );

    const {

      error:uploadError

    } = await supabaseClient

      .storage

      .from("backups")

      .upload(

        fileName,
        blob,

        {
          upsert:false,
          contentType:
            "application/zip"
        }
      );

    if(uploadError){

      throw uploadError;
    }

    /* =====================================================
       SAVE METADATA
    ===================================================== */

    updateLoaderProgress(

      95,

      "Saving backup metadata..."
    );

    const {

      error:metaError

    } = await supabaseClient

      .from("backup_versions")

      .insert([{

        file_name:
          fileName,

        backup_version:
          BACKUP_VERSION,

        format:
          "zip",

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

      throw metaError;
    }

    /* =====================================================
       ROTATE OLD BACKUPS
    ===================================================== */

    await rotateBackups();

    /* =====================================================
       LOG
    ===================================================== */

    await createLog(

      automatic

      ? `Automatic ZIP backup created ${fileName}`

      : `Created ZIP backup ${fileName}`
    );

    updateLoaderProgress(

      100,

      "Backup completed successfully"
    );

    await fetchBackups({

      silent:true
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

    if(button){

      button.disabled = false;

      button.classList.remove(
        "btn-loading"
      );
    }

    setTimeout(() => {

      hideLoader();

    }, 600);
  }
}

/* =========================================================
   ROTATION
========================================================= */

async function rotateBackups(){

  try{

    const {

      data

    } = await supabaseClient

      .from("backup_versions")

      .select("*")

      .order("created_at", {

        ascending:false
      });

    if(

      !data ||
      data.length <= MAX_BACKUPS

    ){

      return;
    }

    const old =
      data.slice(MAX_BACKUPS);

    for(const item of old){

      await supabaseClient

        .storage

        .from("backups")

        .remove([
          item.file_name
        ]);

      await supabaseClient

        .from("backup_versions")

        .delete()

        .eq(
          "id",
          item.id
        );
    }

  }catch(error){

    console.error(
      "ROTATION ERROR:",
      error
    );
  }
}

/* =========================================================
   DOWNLOAD
========================================================= */

async function downloadBackup(fileName){

  try{

    showLoader(

      "Downloading Backup",

      "Preparing secure archive..."
    );

    updateLoaderProgress(
      35
    );

    const {

      data,
      error

    } = await supabaseClient

      .storage

      .from("backups")

      .download(fileName);

    if(error){

      throw error;
    }

    updateLoaderProgress(
      85
    );

    saveAs(
      data,
      fileName
    );

    updateLoaderProgress(
      100
    );

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

    setTimeout(() => {

      hideLoader();

    }, 400);
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
   RESTORE BACKUP
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

      "Downloading recovery archive..."
    );

    const {

      data,
      error

    } = await supabaseClient

      .storage

      .from("backups")

      .download(
        restoreTarget
      );

    if(error){

      throw error;
    }

    updateLoaderProgress(

      15,

      "Reading ZIP archive..."
    );

    const zip =
      await JSZip.loadAsync(data);

    const manifestFile =
      zip.file("manifest.json");

    if(!manifestFile){

      throw new Error(
        "Invalid backup manifest"
      );
    }

    const manifest =
      JSON.parse(

        await manifestFile
          .async("string")
      );

    if(

      !manifest.tables ||
      !Array.isArray(
        manifest.tables
      )

    ){

      throw new Error(
        "Invalid backup structure"
      );
    }

    updateLoaderProgress(

      25,

      "Validating backup data..."
    );

    /* =====================================================
       RESTORE TABLES
    ===================================================== */

    for(

      let i = 0;
      i < manifest.tables.length;
      i++

    ){

      const table =
        manifest.tables[i];

      const percent =

        25 +

        Math.floor(
          (
            i /
            manifest.tables.length
          ) * 60
        );

      updateLoaderProgress(

        percent,

        `Restoring ${table}...`
      );

      const tableFile =
        zip.file(
          `tables/${table}.json`
        );

      if(!tableFile){

        console.warn(
          `Missing ${table}`
        );

        continue;
      }

      const content =
        await tableFile.async(
          "string"
        );

      const rows =
        JSON.parse(content);

      /* ===================================================
         DELETE EXISTING
      =================================================== */

      await supabaseClient

        .from(table)

        .delete()

        .neq("id",0);

      /* ===================================================
         INSERT CHUNKS
      =================================================== */

      if(rows.length > 0){

        for(

          let x = 0;
          x < rows.length;
          x += CHUNK_SIZE

        ){

          const chunk =
            rows.slice(
              x,
              x + CHUNK_SIZE
            );

          const {

            error:insertError

          } = await supabaseClient

            .from(table)

            .insert(chunk);

          if(insertError){

            throw insertError;
          }

          await delay(50);
        }
      }
    }

    updateLoaderProgress(

      95,

      "Finalizing restore..."
    );

    await createLog(

      `Restored ZIP backup ${restoreTarget}`
    );

    updateLoaderProgress(

      100,

      "Restore completed successfully"
    );

    closeRestoreModal();

    showToast(
      "Backup restored successfully"
    );

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

    setTimeout(() => {

      hideLoader();

    }, 700);
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
   DELETE BACKUP
========================================================= */

async function confirmDeleteBackup(){

  if(!deleteTarget){

    return;
  }

  try{

    showLoader(

      "Deleting Backup",

      "Removing backup archive..."
    );

    const {

      error:storageError

    } = await supabaseClient

      .storage

      .from("backups")

      .remove([
        deleteTarget.fileName
      ]);

    if(storageError){

      throw storageError;
    }

    const {

      error:dbError

    } = await supabaseClient

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

      silent:true
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
   RENDER LOADING
========================================================= */

function renderLoading(){

  const table =
    getEl("backupTable");

  if(!table) return;

  table.innerHTML = `

    <tr>

      <td colspan="6" class="table-loading">

        <div class="loading-wrapper">

          <div class="spinner"></div>

          <div>

            <h4>

              Loading backups...

            </h4>

            <p>

              Synchronizing backup archive history.

            </p>

          </div>

        </div>

      </td>

    </tr>
  `;
}

/* =========================================================
   EMPTY
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

          <span class="archive-badge">

            ZIP

          </span>

        </td>

        <td>

          <span class="file-size">

            ${backup.size_kb} KB

          </span>

        </td>

        <td>

          <span class="backup-status success">

            READY

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

  getEl("totalBackups")
    .innerText =
      backups.length;

  getEl("latestBackup")
    .innerText =

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

  getEl("storageUsed")
    .innerText =
      formatBytes(totalBytes);
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

    silent:true
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

      lucide.createIcons();

      console.log(
        "Enterprise backup system initialized"
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