    async function register() {
  let name = document.getElementById("name").value;
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  if (!name || !email || !password) {
    return alert("Fill all fields");
  }

  // 1. CREATE AUTH USER
  let { data, error } = await supabase.auth.signUp({
    email: email,
    password: password
  });

  if (error) return alert(error.message);

  // 2. SAVE EXTRA DATA (ROLE)
  await supabase.from("users").insert([
    {
      id: data.user.id,
      name: name,
      email: email,
      role: "staff" // default
    }
  ]);

  alert("Registered successfully!");
  window.location.href = "login.html";
}