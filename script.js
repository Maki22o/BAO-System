/* =========================================
   SUPABASE CONFIG
========================================= */

const SUPABASE_URL =
  "https://dpdchbusvfktlqjaxdlb.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

/* =========================================
   PASSWORD TOGGLE
========================================= */

function togglePassword(id){

  const input =
    document.getElementById(id);

  if(!input) return;

  const icon =
    input.parentElement.querySelector(
      ".toggle i"
    );

  if(input.type === "password"){

    input.type = "text";

    if(icon){

      icon.setAttribute(
        "data-lucide",
        "eye-off"
      );
    }

  }else{

    input.type = "password";

    if(icon){

      icon.setAttribute(
        "data-lucide",
        "eye"
      );
    }
  }

  lucide.createIcons();
}

/* =========================================
   TOAST
========================================= */

function showToast(message){

  const toast =
    document.getElementById("toast");

  if(!toast) return;

  toast.innerText = message;

  toast.classList.add("show");

  setTimeout(() => {

    toast.classList.remove("show");

  }, 3000);
}

/* =========================================
   THEME ICON
========================================= */

function updateThemeIcon(isLight){

  const themeIcon =
    document.getElementById(
      "themeIcon"
    );

  if(!themeIcon) return;

  themeIcon.innerHTML = isLight

    ? `<i data-lucide="sun"></i>`

    : `<i data-lucide="moon"></i>`;

  lucide.createIcons();
}

/* =========================================
   THEME SYSTEM
========================================= */

function initTheme(){

  const savedTheme =
    localStorage.getItem("theme");

  const isLight =
    savedTheme === "light";

  if(isLight){

    document.body.classList.add(
      "light-mode"
    );
  }

  updateThemeIcon(isLight);

  const themeToggle =
    document.getElementById(
      "themeToggle"
    );

  if(themeToggle){

    themeToggle.addEventListener(
      "click",
      () => {

        document.body.classList.toggle(
          "light-mode"
        );

        const lightMode =
          document.body.classList.contains(
            "light-mode"
          );

        localStorage.setItem(
          "theme",
          lightMode
            ? "light"
            : "dark"
        );

        updateThemeIcon(lightMode);

      }
    );
  }
}

/* =========================================
   LOGIN
========================================= */

async function login(button){

  const email =
    document.getElementById(
      "loginEmail"
    )?.value.trim();

  const password =
    document.getElementById(
      "loginPassword"
    )?.value.trim();

  const remember =
    document.getElementById(
      "rememberMe"
    )?.checked;

  if(!email){

    return showToast(
      "Enter your email"
    );
  }

  if(!password){

    return showToast(
      "Enter your password"
    );
  }

  if(button){

    button.innerText =
      "Signing in...";

    button.disabled = true;
  }

  try{

    const { error } =
      await supabaseClient.auth
      .signInWithPassword({

        email,
        password
      });

    if(error){

      showToast(error.message);

      if(button){

        button.innerText =
          "Sign In";

        button.disabled = false;
      }

      return;
    }

    // REMEMBER EMAIL

    if(remember){

      localStorage.setItem(
        "rememberEmail",
        email
      );

    }else{

      localStorage.removeItem(
        "rememberEmail"
      );
    }

    showToast(
      "Login successful"
    );

    setTimeout(() => {

      window.location.href =
        "dashboard.html";

    }, 1000);

  }catch(error){

    console.error(error);

    showToast(
      "Something went wrong"
    );

    if(button){

      button.innerText =
        "Sign In";

      button.disabled = false;
    }
  }
}

/* =========================================
   REGISTER
========================================= */

async function register(button){

  const fullName =
    document.getElementById(
      "registerName"
    )?.value.trim();

  const email =
    document.getElementById(
      "registerEmail"
    )?.value.trim();

  const password =
    document.getElementById(
      "registerPassword"
    )?.value.trim();

  const confirmPassword =
    document.getElementById(
      "confirmPassword"
    )?.value.trim();

  if(
    !fullName ||
    !email ||
    !password ||
    !confirmPassword
  ){

    return showToast(
      "Fill all fields"
    );
  }

  if(password !== confirmPassword){

    return showToast(
      "Passwords do not match"
    );
  }

  if(password.length < 6){

    return showToast(
      "Password must be at least 6 characters"
    );
  }

  if(button){

    button.innerText =
      "Creating...";

    button.disabled = true;
  }

  try{

    const { data, error } =
      await supabaseClient.auth
      .signUp({

        email,
        password,

        options: {

          data: {

            fullname: fullName
          }
        }
      });

    if(error){

      showToast(error.message);

      if(button){

        button.innerText =
          "Create Account";

        button.disabled = false;
      }

      return;
    }

    const userId =
      data?.user?.id;

    if(userId){

      let result =
        await supabaseClient
          .from("profiles")
          .upsert([{
            id: userId,
            email,
            fullname: fullName,
            role: "regular_user",
            avatar_url: null
          }], {
            onConflict: "id"
          });

      if(result.error){
        result =
          await supabaseClient
            .from("profiles")
            .upsert([{
              id: userId,
              email,
              full_name: fullName,
              role: "regular_user",
              avatar_url: null
            }], {
              onConflict: "id"
            });
      }

      if(result.error){
        console.error(result.error);
      }
    }

    showToast(
      "Account created successfully"
    );

    setTimeout(() => {

      window.location.href =
        "index.html";

    }, 1200);

  }catch(error){

    console.error(error);

    showToast(
      "Something went wrong"
    );

    if(button){

      button.innerText =
        "Create Account";

      button.disabled = false;
    }
  }
}

/* =========================================
   PASSWORD RESET
========================================= */

async function sendReset(){

  const email =
    document.getElementById(
      "resetEmail"
    )?.value.trim();

  if(
    !email ||
    !email.includes("@")
  ){

    return showToast(
      "Enter a valid email"
    );
  }

  try{

    const { error } =
      await supabaseClient.auth
      .resetPasswordForEmail(
        email,
        {

          redirectTo:
            window.location.origin
        }
      );

    if(error){

      return showToast(
        error.message
      );
    }

    showToast(
      "Reset link sent"
    );

    closeModal();

  }catch(error){

    console.error(error);

    showToast(
      "Something went wrong"
    );
  }
}

/* =========================================
   MODAL
========================================= */

function openModal(){

  const modal =
    document.getElementById(
      "modal"
    );

  if(modal){

    modal.style.display =
      "flex";
  }
}

function closeModal(){

  const modal =
    document.getElementById(
      "modal"
    );

  if(modal){

    modal.style.display =
      "none";
  }
}

/* =========================================
   AUTH SESSION
========================================= */

async function checkSession(){

  try{

    const { data } =
      await supabaseClient.auth
      .getSession();

    const session =
      data?.session;

    if(
      session &&
      window.location.pathname.includes(
        "index.html"
      )
    ){

      window.location.href =
        "dashboard.html";
    }

  }catch(error){

    console.error(error);
  }
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
   REMEMBER EMAIL
========================================= */

function loadRememberedEmail(){

  const rememberedEmail =
    localStorage.getItem(
      "rememberEmail"
    );

  const loginEmail =
    document.getElementById(
      "loginEmail"
    );

  const rememberCheckbox =
    document.getElementById(
      "rememberMe"
    );

  if(
    rememberedEmail &&
    loginEmail
  ){

    loginEmail.value =
      rememberedEmail;

    if(rememberCheckbox){

      rememberCheckbox.checked = true;
    }
  }
}

/* =========================================
   INITIALIZATION
========================================= */

window.onload = async function(){

  initTheme();

  loadRememberedEmail();

  await checkSession();

  lucide.createIcons();
};
