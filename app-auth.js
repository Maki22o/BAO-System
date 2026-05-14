const APP_SUPABASE_URL = "https://dpdchbusvfktlqjaxdlb.supabase.co";
const APP_SUPABASE_KEY = "sb_publishable_ddIRIgAUNFVLtcz3EpvXfw_5HN2Jeqg";

if (!window.appSupabase) {
  window.appSupabase = supabase.createClient(APP_SUPABASE_URL, APP_SUPABASE_KEY);
}

window.appAuth = {
  user: null,
  profile: null,
  role: "regular_user"
};

function mapRoleLabel(role) {
  if (role === "admin_user") return "System Admin";
  return "Regular User";
}

function isAdminRole(role) {
  return role === "admin_user";
}

async function fetchProfileWithFallback(user) {
  const client = window.appSupabase;
  let { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[RBAC:fetchProfile]", error);
    return null;
  }

  if (!data) {
    const basePayload = {
      id: user.id,
      email: user.email ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      role: "regular_user"
    };

    const fullName =
      user.user_metadata?.fullname ??
      user.user_metadata?.full_name ??
      null;

    const payloads = [
      { ...basePayload, fullname: fullName },
      { ...basePayload, full_name: fullName }
    ];

    let created = null;
    let lastError = null;
    for (const payload of payloads) {
      const res =
        await client.from("profiles")
          .insert([payload])
          .select("*")
          .maybeSingle();

      if (!res.error) {
        created = res.data;
        break;
      }

      lastError = res.error;
    }

    if (!created) {
      console.error("[RBAC:createProfile]", lastError);
      return null;
    }

    data = created;
  }

  return data;
}

function applyRoleBasedNav(role) {
  const adminLinks = document.querySelectorAll('a[href="admin.html"]');
  const isAdmin = isAdminRole(role);
  adminLinks.forEach((link) => {
    link.style.display = isAdmin ? "" : "none";
  });
}

function currentPageIsAdmin() {
  return window.location.pathname.toLowerCase().includes("admin.html");
}

async function initProtectedPageAuth() {
  const client = window.appSupabase;
  const { data, error } = await client.auth.getSession();

  if (error || !data?.session?.user) {
    window.location.href = "index.html";
    return false;
  }

  const user = data.session.user;
  const profile = await fetchProfileWithFallback(user);
  const role = profile?.role || "regular_user";

  window.appAuth.user = user;
  window.appAuth.profile = profile;
  window.appAuth.role = role;
  window.appAuth.roleLabel = mapRoleLabel(role);

  applyRoleBasedNav(role);

  if (currentPageIsAdmin() && !isAdminRole(role)) {
    window.location.href = "dashboard.html";
    return false;
  }

  return true;
}

window.initProtectedPageAuth = initProtectedPageAuth;
window.mapRoleLabel = mapRoleLabel;
window.isAdminRole = isAdminRole;
