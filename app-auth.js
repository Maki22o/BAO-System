const APP_SUPABASE_URL =
  "https://dpdchbusvfktlqjaxdlb.supabase.co";

const APP_SUPABASE_KEY =
  "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";

// Supabase

if(!window.appSupabase){

  window.appSupabase =
    supabase.createClient(

      APP_SUPABASE_URL,

      APP_SUPABASE_KEY
    );
}

// Global state

window.appAuth = {

  user: null,

  profile: null,

  role: "regular_user",

  roleLabel: "Regular User"
};

// Role label

function mapRoleLabel(role){

  return role === "admin_user"

    ? "System Admin"

    : "Regular User";
}

// Role check

function isAdminRole(role){

  return role === "admin_user";
}

// Admin page check

function currentPageIsAdmin(){

  return window.location.pathname
    .toLowerCase()
    .includes("admin.html");
}

// Backup page check

function currentPageIsBackup(){

  return window.location.pathname
    .toLowerCase()
    .includes("backup.html");
}

// Create missing profile

async function createProfile(user){

  const payload = {

    id:
      user.id,

    fullname:

      user.user_metadata?.fullname ||

      user.user_metadata?.full_name ||

      "Unnamed User",

    email:
      user.email ||

      null,

    role:
      "regular_user",

    avatar_url:

      user.user_metadata?.avatar_url ||

      null
  };

  const { data, error } =
    await window.appSupabase

      .from("profiles")

      .upsert([payload])

      .select()

      .single();

  if(error){

    console.error(
      "[RBAC:createProfile]",
      error
    );

    return null;
  }

  return data;
}

// Fetch profile

async function fetchProfile(user){

  const { data, error } =
    await window.appSupabase

      .from("profiles")

      .select("*")

      .eq("id", user.id)

      .maybeSingle();

  if(error){

    console.error(
      "[RBAC:fetchProfile]",
      error
    );

    return null;
  }

  // Auto-create profile

  if(!data){

    return await createProfile(
      user
    );
  }

  // Sync email

  if(
    !data.email &&
    user.email
  ){

    await window.appSupabase

      .from("profiles")

      .update({

        email:
          user.email
      })

      .eq("id", user.id);

    data.email =
      user.email;
  }

  return data;
}

// Apply nav permissions

function applyRoleBasedNav(role){

  const adminLinks =
    document.querySelectorAll(
      'a[href="admin.html"]'
    );

  const backupLinks =
    document.querySelectorAll(
      'a[href="backup.html"]'
    );

  const isAdmin =
    isAdminRole(role);

  adminLinks.forEach(link => {

    link.style.display =

      isAdmin
        ? ""
        : "none";
  });

  backupLinks.forEach(link => {

    link.style.display =

      isAdmin
        ? ""
        : "none";
  });
}

// Apply user info

function applyUserInfo(){

  const fullName =

    window.appAuth.profile
      ?.fullname ||

    window.appAuth.user
      ?.email ||

    "User";

  const roleLabel =
    window.appAuth.roleLabel;

  // Name

  document.querySelectorAll(
    "#userName"
  ).forEach(el => {

    el.innerText =
      fullName;
  });

  // Role

  document.querySelectorAll(
    "#userRole"
  ).forEach(el => {

    el.innerText =
      roleLabel;
  });

  // Avatar

  document.querySelectorAll(
    "#userInitial"
  ).forEach(el => {

    el.innerText =

      String(fullName)
        .trim()
        .charAt(0)
        .toUpperCase();
  });
}

// Protected auth

async function initProtectedPageAuth(){

  const client =
    window.appSupabase;

  const { data, error } =
    await client.auth.getSession();

  if(
    error ||
    !data?.session?.user
  ){

    window.location.href =
      "index.html";

    return false;
  }

  const user =
    data.session.user;

  const profile =
    await fetchProfile(user);

  const role =

    profile?.role ||

    "regular_user";

  // Save state

  window.appAuth.user =
    user;

  window.appAuth.profile =
    profile;

  window.appAuth.role =
    role;

  window.appAuth.roleLabel =
    mapRoleLabel(role);

  // Apply UI

  applyRoleBasedNav(role);

  applyUserInfo();

  // Admin-only pages

  if(
    (
      currentPageIsAdmin() ||

      currentPageIsBackup()
    ) &&

    !isAdminRole(role)
  ){

    window.location.href =
      "dashboard.html";

      return false;
  }

  return true;
}

// Logout

async function logout(){

  await window.appSupabase.auth
    .signOut();

  window.location.href =
    "index.html";
}

// Exports

window.initProtectedPageAuth =
  initProtectedPageAuth;

window.mapRoleLabel =
  mapRoleLabel;

window.isAdminRole =
  isAdminRole;

window.logout =
  logout;