let profiles = [];
let logs = [];
let editId = null;

function logSupabaseError(stage, error, context = {}) {
  console.error(`[UserManagement:${stage}]`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    status: error?.status,
    context
  });
}

function roleLabel(role) {
  return role === "admin_user" ? "System Admin" : "Regular User";
}

function roleBadgeClass(role) {
  return role === "admin_user" ? "admin" : "staff";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = msg;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 2300);
}

async function logout() {
  await window.appSupabase.auth.signOut();
  window.location.href = "index.html";
}

function openModal() {
  document.getElementById("modal").style.display = "flex";
  if (!editId) {
    document.getElementById("modalTitle").innerText = "Add Profile";
    document.getElementById("fullName").value = "";
    document.getElementById("email").value = "";
    document.getElementById("role").value = "regular_user";
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

async function addLog(text) {
  const payload = {
    created_by: window.appAuth.user.id,
    text
  };
  const { error } = await window.appSupabase.from("logs").insert([payload]);
  if (error) logSupabaseError("addLog", error, { text });
}

async function fetchLogs() {
  const { data, error } = await window.appSupabase
    .from("logs")
    .select("*")
    .eq("created_by", window.appAuth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logSupabaseError("fetchLogs", error);
    logs = [];
    return;
  }
  logs = data || [];
}

function renderLogs() {
  const logList = document.getElementById("logList");
  if (!logList) return;
  logList.innerHTML = logs
    .map((l) => `<p>${l.text || l.message || ""} <br><small>${new Date(l.created_at || l.time || Date.now()).toLocaleString()}</small></p>`)
    .join("");
}

async function fetchProfiles() {
  const { data, error } = await window.appSupabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("fetchProfiles", error);
    profiles = [];
    showToast("Unable to load users");
    return;
  }
  profiles = data || [];
}

function updateStats() {
  const total = profiles.length;
  const admins = profiles.filter((p) => p.role === "admin_user").length;
  const regular = total - admins;
  document.getElementById("totalUsers").innerText = total;
  document.getElementById("totalAdmins").innerText = admins;
  document.getElementById("totalStaff").innerText = regular;
}

function renderUsers() {
  const table = document.getElementById("userTable");
  const query = (document.getElementById("userSearch")?.value || "").toLowerCase();
  if (!table) return;
  table.innerHTML = "";

  const filtered = profiles.filter((p) => {
    const fullName = (p.fullname || p.full_name || "").toLowerCase();
    const email = (p.email || "").toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  filtered.forEach((p) => {
    table.innerHTML += `
      <tr>
        <td>${p.fullname || p.full_name || "-"}</td>
        <td>${p.email || "-"}</td>
        <td><span class="badge ${roleBadgeClass(p.role)}">${roleLabel(p.role)}</span></td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</td>
        <td class="actions">
          <button class="edit" onclick="editUser('${p.id}')">Edit</button>
          <button onclick="toggleRole('${p.id}')">Toggle Role</button>
          <button class="delete" onclick="deleteUser('${p.id}')">Delete</button>
        </td>
      </tr>
    `;
  });

  updateStats();
  renderLogs();
}

function editUser(id) {
  const profile = profiles.find((p) => String(p.id) === String(id));
  if (!profile) return;
  editId = profile.id;
  document.getElementById("modalTitle").innerText = "Edit Profile";
  document.getElementById("fullName").value = profile.fullname || profile.full_name || "";
  document.getElementById("email").value = profile.email || "";
  document.getElementById("role").value = profile.role || "regular_user";
  openModal();
}

async function saveUser() {
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const role = document.getElementById("role").value;

  if (!fullName || !email) {
    showToast("Fill all fields");
    return;
  }

  try {
    if (editId) {
      let result =
        await window.appSupabase
          .from("profiles")
          .update({
            fullname: fullName,
            email,
            role
          })
          .eq("id", editId);

      if(result.error){
        result =
          await window.appSupabase
            .from("profiles")
            .update({
              full_name: fullName,
              email,
              role
            })
            .eq("id", editId);
      }

      if (result.error) throw result.error;
      await addLog(`Updated profile: ${email}`);
      showToast("Profile updated");
    } else {
      showToast("Select a user row to edit");
      return;
    }

    editId = null;
    closeModal();
    await refreshAll();
  } catch (error) {
    logSupabaseError("saveUser", error, { editId, email, role });
    showToast(error?.message ? `Unable to save: ${error.message}` : "Unable to save profile");
  }
}

async function toggleRole(id) {
  const profile = profiles.find((p) => String(p.id) === String(id));
  if (!profile) return;
  const nextRole = profile.role === "admin_user" ? "regular_user" : "admin_user";

  try {
    const { error } = await window.appSupabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", id);
    if (error) throw error;
    await addLog(`Changed role for ${profile.email} to ${roleLabel(nextRole)}`);
    showToast("Role updated");
    await refreshAll();
  } catch (error) {
    logSupabaseError("toggleRole", error, { id, nextRole });
    showToast("Unable to update role");
  }
}

async function deleteUser(id) {
  const profile = profiles.find((p) => String(p.id) === String(id));
  if (!profile) return;
  if (!confirm(`Delete profile for ${profile.email}?`)) return;

  try {
    const { error } = await window.appSupabase.from("profiles").delete().eq("id", id);
    if (error) throw error;
    await addLog(`Deleted profile: ${profile.email}`);
    showToast("Profile deleted");
    await refreshAll();
  } catch (error) {
    logSupabaseError("deleteUser", error, { id });
    showToast("Unable to delete profile");
  }
}

async function refreshAll() {
  await fetchProfiles();
  await fetchLogs();
  renderUsers();
}

window.addEventListener("load", async () => {
  const ok = await window.initProtectedPageAuth();
  if (!ok) return;
  if (!window.isAdminRole(window.appAuth.role)) {
    window.location.href = "dashboard.html";
    return;
  }
  await refreshAll();
});
