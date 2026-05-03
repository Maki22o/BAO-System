// ================= PASSWORD TOGGLE =================
function togglePassword(id) {
  let input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

// ================= TOAST =================
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.innerText = msg;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ================= DARK MODE =================
function toggleDark() {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("darkMode", "enabled");
  } else {
    localStorage.removeItem("darkMode");
  }
}

// ================= PASSWORD STRENGTH =================
let regPass = document.getElementById("regPass");

if (regPass) {
  regPass.addEventListener("input", function () {
    let val = this.value;
    let strength = document.getElementById("strength");

    if (!strength) return;

    if (val.length < 6) {
      strength.innerText = "Weak password";
      strength.style.color = "red";
    } else if (val.length < 10) {
      strength.innerText = "Medium strength";
      strength.style.color = "orange";
    } else {
      strength.innerText = "Strong password";
      strength.style.color = "green";
    }
  });
}

// ================= INIT ADMIN =================
function initAdmin() {
  let users = JSON.parse(localStorage.getItem("users")) || [];

  if (users.length === 0) {
    users.push({
      username: "admin",
      password: "admin123",
      role: "admin"
    });

    localStorage.setItem("users", JSON.stringify(users));
  }
}

// ================= LOGIN =================
function login(btn) {
  let email = document.getElementById("loginEmail")?.value.trim();
  let pass = document.getElementById("loginPassword")?.value.trim();
  let remember = document.getElementById("rememberMe")?.checked;

  if (!email) return showToast("Enter email");
  if (!pass) return showToast("Enter password");

  let users = JSON.parse(localStorage.getItem("users")) || [];

  let user = users.find(u =>
    u.username === email && u.password === pass
  );

  if (!user) return showToast("Invalid credentials");

  localStorage.setItem("currentUser", JSON.stringify(user));

  // remember me
  if (remember) {
    localStorage.setItem("rememberEmail", email);
  } else {
    localStorage.removeItem("rememberEmail");
  }

  // loading state
  if (btn) {
    btn.innerText = "Signing in...";
    btn.disabled = true;
  }

  setTimeout(() => {
    showToast("Login successful");

    // ✅ FIXED PATH (FINAL)
    window.location.href = "dashboard.html";

  }, 800);
}

// ================= REGISTER =================
function register(btn) {
  let email = document.getElementById("regEmail")?.value.trim();
  let pass = document.getElementById("regPass")?.value.trim();
  let confirm = document.getElementById("confirmPass")?.value.trim();

  if (!email || !pass || !confirm) {
    return showToast("Fill all fields");
  }

  if (pass !== confirm) {
    return showToast("Passwords do not match");
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  if (users.find(u => u.username === email)) {
    return showToast("User already exists");
  }

  users.push({
    username: email,
    password: pass,
    role: "staff"
  });

  localStorage.setItem("users", JSON.stringify(users));

  if (btn) {
    btn.innerText = "Creating...";
    btn.disabled = true;
  }

  setTimeout(() => {
    showToast("Account created");

    // back to login
    window.location.href = "index.html";

  }, 1000);
}

// ================= MODAL =================
function openModal() {
  let modal = document.getElementById("modal");
  if (modal) modal.style.display = "flex";
}

function closeModal() {
  let modal = document.getElementById("modal");
  if (modal) modal.style.display = "none";
}

function sendReset() {
  let email = document.getElementById("resetEmail")?.value;

  if (!email || !email.includes("@")) {
    return showToast("Enter a valid email");
  }

  showToast("Reset link sent (demo)");
  closeModal();
}

// ================= INIT =================
window.onload = function () {
  initAdmin();

  let savedEmail = localStorage.getItem("rememberEmail");

  if (savedEmail && document.getElementById("loginEmail")) {
    document.getElementById("loginEmail").value = savedEmail;

    let checkbox = document.getElementById("rememberMe");
    if (checkbox) checkbox.checked = true;
  }

  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark");
  }
};