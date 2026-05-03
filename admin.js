let currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser || currentUser.role !== "admin") {
  alert("Admin access only");
  window.location.href = "dashboard.html";
}

let users = JSON.parse(localStorage.getItem("users")) || [];
let logs = JSON.parse(localStorage.getItem("logs")) || [];
let editIndex = null;

function initAdmin() {
  if (users.length === 0) {
    users.push({
      username: "admin",
      password: "admin123",
      role: "admin",
      status: "active"
    });
    localStorage.setItem("users", JSON.stringify(users));
  }
}

function addLog(text) {
  logs.unshift({
    text,
    time: new Date().toLocaleString()
  });

  localStorage.setItem("logs", JSON.stringify(logs));
}

function renderUsers() {
  let table = document.getElementById("userTable");
  table.innerHTML = "";

  users.forEach((u, i) => {
    table.innerHTML += `
      <tr>
        <td>${u.username}</td>
        <td>••••••••</td>
        <td><span class="badge ${u.role}">${u.role}</span></td>
        <td>${u.status || "active"}</td>
        <td class="actions">
          <button class="edit" onclick="editUser(${i})">Edit</button>

          <button onclick="toggleStatus(${i})">
            ${u.status === "disabled" ? "Enable" : "Disable"}
          </button>

          <button onclick="changePassword(${i})">Password</button>

          <button class="delete" onclick="deleteUser(${i})">Delete</button>
        </td>
      </tr>
    `;
  });

  updateStats();
  renderLogs();
}

function saveUser() {
  let username = document.getElementById("username").value.trim();
  let password = document.getElementById("password").value.trim();
  let role = document.getElementById("role").value;

  if (!username || !password) {
    showToast("Fill all fields");
    return;
  }

  if (editIndex !== null) {
    users[editIndex] = {
      ...users[editIndex],
      username,
      password,
      role
    };
    addLog(`Updated user: ${username}`);
    showToast("User updated");
  } else {
    users.push({
      username,
      password,
      role,
      status: "active"
    });
    addLog(`Added user: ${username}`);
    showToast("User added");
  }

  localStorage.setItem("users", JSON.stringify(users));

  editIndex = null;
  closeModal();
  renderUsers();
}

function editUser(index) {
  let u = users[index];

  document.getElementById("username").value = u.username;
  document.getElementById("password").value = u.password;
  document.getElementById("role").value = u.role;

  document.getElementById("modalTitle").innerText = "Edit User";

  editIndex = index;
  openModal();
}

function deleteUser(index) {
  if (users[index].username === "admin") {
    showToast("Cannot delete main admin");
    return;
  }

  addLog(`Deleted user: ${users[index].username}`);

  users.splice(index, 1);
  localStorage.setItem("users", JSON.stringify(users));

  renderUsers();
  showToast("User deleted");
}

function toggleStatus(index) {
  let user = users[index];

  user.status = user.status === "disabled" ? "active" : "disabled";

  addLog(`${user.username} is now ${user.status}`);

  localStorage.setItem("users", JSON.stringify(users));
  renderUsers();
}

function changePassword(index) {
  let newPass = prompt("Enter new password:");

  if (newPass) {
    users[index].password = newPass;
    addLog(`Password changed for ${users[index].username}`);

    localStorage.setItem("users", JSON.stringify(users));
    showToast("Password updated");
  }
}

function updateStats() {
  document.getElementById("totalUsers").innerText = users.length;

  document.getElementById("totalAdmins").innerText =
    users.filter(u => u.role === "admin").length;

  document.getElementById("totalStaff").innerText =
    users.filter(u => u.role === "staff").length;
}

function renderLogs() {
  let logList = document.getElementById("logList");

  if (!logList) return;

  logList.innerHTML = logs.map(l => `
    <p>${l.text} <br><small>${l.time}</small></p>
  `).join("");
}

function openModal() {
  document.getElementById("modal").style.display = "flex";

  if (editIndex === null) {
    document.getElementById("modalTitle").innerText = "Add User";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("role").value = "admin";
  }

  document.getElementById("password").type = "password";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function togglePassword() {
  let input = document.getElementById("password");
  input.type = input.type === "password" ? "text" : "password";
}

function showToast(msg) {
  let toast = document.getElementById("toast");

  toast.innerText = msg;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 2000);
}

function logout() {
  window.location.href = "index.html";
}

window.onload = () => {
  initAdmin();
  renderUsers();
};