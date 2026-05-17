const supabaseClient =
  window.appSupabase;

let profiles = [];

let logs = [];

let editId = null;

let savingUser = false;

/* =========================================
   ROLE LABEL
========================================= */

function roleLabel(role){

  return role === "admin_user"

    ? "System Admin"

    : "Regular User";
}

/* =========================================
   ROLE BADGE
========================================= */

function roleBadgeClass(role){

  return role === "admin_user"

    ? "admin"

    : "staff";
}

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

  }, 2300);
}

/* =========================================
   LOGOUT
========================================= */

async function logout(){

  await window.appSupabase.auth
    .signOut();

  window.location.href =
    "index.html";
}

/* =========================================
   OPEN MODAL
========================================= */

function openModal(){

  editId = null;

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Create User";

  document.getElementById(
    "fullName"
  ).value = "";

  document.getElementById(
    "email"
  ).value = "";

  document.getElementById(
    "password"
  ).value = "";

  document.getElementById(
    "role"
  ).value =
    "regular_user";

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
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
   ADD LOG
========================================= */

async function addLog(text){

  try{

    await window.appSupabase

      .from("logs")

      .insert([{

        created_by:
          window.appAuth.user.id,

        text
      }]);

  }catch(error){

    console.error(error);
  }
}

/* =========================================
   FETCH LOGS
========================================= */

async function fetchLogs(){

  const { data, error } =
    await window.appSupabase

      .from("logs")

      .select("*")

      .order("created_at", {

        ascending: false
      })

      .limit(50);

  if(error){

    console.error(error);

    logs = [];

    return;
  }

  logs = data || [];
}

/* =========================================
   RENDER LOGS
========================================= */

function renderLogs(){

  const container =
    document.getElementById(
      "logList"
    );

  if(!container) return;

  container.innerHTML =

    logs.map(log => `

      <p>

        ${log.text}

        <br>

        <small>

          ${
            new Date(
              log.created_at
            ).toLocaleString()
          }

        </small>

      </p>

    `).join("");
}

/* =========================================
   FETCH USERS
========================================= */

async function fetchProfiles(){

  const { data, error } =
    await window.appSupabase

      .from("profiles")

      .select("*")

      .order("created_at", {

        ascending: false
      });

  if(error){

    console.error(error);

    profiles = [];

    showToast(
      "Unable to load users"
    );

    return;
  }

  profiles = data || [];
}

/* =========================================
   UPDATE STATS
========================================= */

function updateStats(){

  const total =
    profiles.length;

  const admins =
    profiles.filter(profile =>

      profile.role ===
      "admin_user"

    ).length;

  const regular =
    total - admins;

  document.getElementById(
    "totalUsers"
  ).innerText =
    total;

  document.getElementById(
    "totalAdmins"
  ).innerText =
    admins;

  document.getElementById(
    "totalStaff"
  ).innerText =
    regular;
}

/* =========================================
   RENDER USERS
========================================= */

function renderUsers(){

  const table =
    document.getElementById(
      "userTable"
    );

  if(!table) return;

  const query =

    (
      document.getElementById(
        "userSearch"
      )?.value || ""
    ).toLowerCase();

  table.innerHTML = "";

  const filtered =
    profiles.filter(profile => {

      const fullName =
        (
          profile.fullname || ""
        ).toLowerCase();

      const email =
        (
          profile.email || ""
        ).toLowerCase();

      const role =
        (
          profile.role || ""
        ).toLowerCase();

      return (

        fullName.includes(query) ||

        email.includes(query) ||

        role.includes(query)
      );
    });

  if(filtered.length === 0){

    table.innerHTML = `

      <tr>

        <td colspan="5">

          No users found

        </td>

      </tr>
    `;

    return;
  }

  filtered.forEach(profile => {

    table.innerHTML += `

      <tr>

        <td>

          <div class="user-cell">

            <div class="user-avatar">

              ${
                String(
                  profile.fullname || "U"
                )
                .charAt(0)
                .toUpperCase()
              }

            </div>

            <div class="user-meta">

              <strong>

                ${
                  profile.fullname || "-"
                }

              </strong>

            </div>

          </div>

        </td>

        <td>

          ${profile.email || "-"}

        </td>

        <td>

          <span class="badge ${roleBadgeClass(profile.role)}">

            ${roleLabel(profile.role)}

          </span>

        </td>

        <td>

          ${
            profile.created_at

            ? new Date(
                profile.created_at
              ).toLocaleDateString()

            : "-"
          }

        </td>

        <td>

          <div class="actions">

            <button
              class="edit"
              onclick="editUser('${profile.id}')"
            >

              Edit

            </button>

            <button
              class="toggle"
              onclick="toggleRole('${profile.id}')"
            >

              Toggle Role

            </button>

            <button
              class="delete"
              onclick="deleteUser('${profile.id}')"
            >

              Delete

            </button>

          </div>

        </td>

      </tr>
    `;
  });

  updateStats();

  renderLogs();
}

/* =========================================
   EDIT USER
========================================= */

function editUser(id){

  const profile =
    profiles.find(profile =>

      String(profile.id) ===
      String(id)
    );

  if(!profile){

    showToast(
      "User not found"
    );

    return;
  }

  editId = profile.id;

  document.getElementById(
    "modalTitle"
  ).innerText =
    "Edit User";

  document.getElementById(
    "fullName"
  ).value =
    profile.fullname || "";

  document.getElementById(
    "email"
  ).value =
    profile.email || "";

  document.getElementById(
    "password"
  ).value = "";

  document.getElementById(
    "role"
  ).value =
    profile.role || "regular_user";

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

/* =========================================
   SAVE USER
========================================= */

async function saveUser(){

  if(savingUser){

    return;
  }

  savingUser = true;

  const saveBtn =
    document.querySelector(
      ".btn-save"
    );

  if(saveBtn){

    saveBtn.disabled = true;

    saveBtn.innerText =
      "Saving...";
  }

  try{

    const fullName =
      document.getElementById(
        "fullName"
      ).value.trim();

    const email =
      document.getElementById(
        "email"
      ).value.trim();

    const password =
      document.getElementById(
        "password"
      ).value.trim();

    const role =
      document.getElementById(
        "role"
      ).value;

    if(
      !fullName ||
      !email
    ){

      throw new Error(
        "Please complete all fields"
      );
    }

    // Edit existing

    if(editId){

      const { error } =
        await window.appSupabase

          .from("profiles")

          .update({

            fullname:
              fullName,

            email,

            role
          })

          .eq("id", editId);

      if(error) throw error;

      await addLog(

        `Updated user: ${email}`
      );

      showToast(
        "User updated"
      );

    }else{

      if(password.length < 6){

        throw new Error(
          "Password must be at least 6 characters"
        );
      }

      const { data, error } =

        await window.appSupabase.auth
          .signUp({

            email,
            password,

            options: {

              data: {

                fullname:
                  fullName
              }
            }
          });

      if(error) throw error;

      const userId =
        data?.user?.id;

      if(!userId){

        throw new Error(
          "Unable to create user"
        );
      }

      const { error:profileError } =

        await window.appSupabase

          .from("profiles")

          .upsert([{

            id: userId,

            fullname:
              fullName,

            email,

            role
          }]);

      if(profileError)
        throw profileError;

      await addLog(

        `Created user: ${email}`
      );

      showToast(
        "User created"
      );
    }

    closeModal();

    editId = null;

    await refreshAll();

  }catch(error){

    console.error(error);

    showToast(
      error.message ||
      "Unable to save user"
    );

  }finally{

    savingUser = false;

    if(saveBtn){

      saveBtn.disabled = false;

      saveBtn.innerText =
        "Save User";
    }
  }
}

/* =========================================
   TOGGLE ROLE
========================================= */

async function toggleRole(id){

  const profile =
    profiles.find(profile =>

      String(profile.id) ===
      String(id)
    );

  if(!profile){

    showToast(
      "User not found"
    );

    return;
  }

  const nextRole =

    profile.role ===
    "admin_user"

    ? "regular_user"

    : "admin_user";

  try{

    const { error } =
      await window.appSupabase

        .from("profiles")

        .update({

          role: nextRole
        })

        .eq("id", id);

    if(error) throw error;

    // Update local state immediately

    profile.role =
      nextRole;

    renderUsers();

    await addLog(

      `Changed role for ${profile.email}`
    );

    showToast(
      "Role updated"
    );

  }catch(error){

    console.error(error);

    showToast(
      "Unable to update role"
    );
  }
}

/* =========================================
   DELETE USER
========================================= */

async function deleteUser(id){

  const profile =
    profiles.find(profile =>

      String(profile.id) ===
      String(id)
    );

  if(!profile){

    showToast(
      "User not found"
    );

    return;
  }

  const confirmed =
    confirm(
      `Delete profile for ${profile.email}?`
    );

  if(!confirmed) return;

  try{

    const { error } =
      await window.appSupabase

        .from("profiles")

        .delete()

        .eq("id", id);

    if(error) throw error;

    // Remove locally immediately

    profiles =
      profiles.filter(item =>

        String(item.id) !==
        String(id)
      );

    renderUsers();

    await addLog(

      `Deleted profile: ${profile.email}`
    );

    showToast(
      "Profile deleted"
    );

  }catch(error){

    console.error(error);

    showToast(
      "Unable to delete profile"
    );
  }
}

/* =========================================
   REFRESH
========================================= */

async function refreshAll(){

  const table =
    document.getElementById(
      "userTable"
    );

  if(table){

    table.innerHTML = `

      <tr>

        <td colspan="5">

          Loading users...

        </td>

      </tr>
    `;
  }

  await fetchProfiles();

  await fetchLogs();

  renderUsers();
}

/* =========================================
   INIT
========================================= */

window.addEventListener(
  "load",
  async () => {

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

    await refreshAll();

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
      "Admin page initialized successfully"
    );
  }
);