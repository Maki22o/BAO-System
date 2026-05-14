let profiles = [];

let logs = [];

let editId = null;

// Role label

function roleLabel(role){

  return role === "admin_user"

    ? "System Admin"

    : "Regular User";
}

// Badge

function roleBadgeClass(role){

  return role === "admin_user"

    ? "admin"

    : "staff";
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

  toast.style.display =
    "block";

  setTimeout(() => {

    toast.style.display =
      "none";

  }, 2300);
}

// Logout

async function logout(){

  await window.appSupabase.auth
    .signOut();

  window.location.href =
    "index.html";
}

// Open modal

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

// Close modal

function closeModal(){

  document.getElementById(
    "modal"
  ).style.display =
    "none";
}

// Logs

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

// Fetch logs

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

// Render logs

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

// Fetch users

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

// Stats

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

// Render users

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

  filtered.forEach(profile => {

    table.innerHTML += `

      <tr>

        <td>

          ${profile.fullname || "-"}

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

        <td class="actions">

          <button
            class="edit"
            onclick="editUser('${profile.id}')"
          >

            Edit

          </button>

          <button
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

        </td>

      </tr>
    `;
  });

  updateStats();

  renderLogs();
}

// Edit

function editUser(id){

  const profile =
    profiles.find(profile =>

      String(profile.id) ===
      String(id)
    );

  if(!profile) return;

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
    profile.role;

  document.getElementById(
    "modal"
  ).style.display =
    "flex";
}

// Save

async function saveUser(){

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

    return showToast(
      "Fill all fields"
    );
  }

  // Edit existing

  if(editId){

    try{

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

      editId = null;

      closeModal();

      await refreshAll();

      return;

    }catch(error){

      console.error(error);

      showToast(
        "Unable to update user"
      );

      return;
    }
  }

  // Create new user

  if(password.length < 6){

    return showToast(
      "Password must be at least 6 characters"
    );
  }

  try{

    // Register user

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

    // Update role

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

    closeModal();

    await refreshAll();

  }catch(error){

    console.error(error);

    showToast(

      error?.message ||

      "Unable to create user"
    );
  }
}

// Toggle role

async function toggleRole(id){

  const profile =
    profiles.find(profile =>

      String(profile.id) ===
      String(id)
    );

  if(!profile) return;

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

    await addLog(

      `Changed role for ${profile.email}`
    );

    showToast(
      "Role updated"
    );

    await refreshAll();

  }catch(error){

    console.error(error);

    showToast(
      "Unable to update role"
    );
  }
}

// Delete

async function deleteUser(id){

  const profile =
    profiles.find(profile =>

      String(profile.id) ===
      String(id)
    );

  if(!profile) return;

  if(!confirm(

    `Delete profile for ${profile.email}?`

  )) return;

  try{

    const { error } =
      await window.appSupabase

        .from("profiles")

        .delete()

        .eq("id", id);

    if(error) throw error;

    await addLog(

      `Deleted profile: ${profile.email}`
    );

    showToast(
      "Profile deleted"
    );

    await refreshAll();

  }catch(error){

    console.error(error);

    showToast(
      "Unable to delete profile"
    );
  }
}

// Refresh

async function refreshAll(){

  await fetchProfiles();

  await fetchLogs();

  renderUsers();
}

// Init

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

    lucide.createIcons();
  }
);