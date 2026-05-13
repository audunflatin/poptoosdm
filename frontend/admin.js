let allUsers = [];
let currentPage = 1;
const PAGE_SIZE = 15;

function setResult(el, text, ok) {
  el.innerText = text;
  el.className = text ? (ok ? "status-ok" : "status-error") : "";
}

function getSearchQuery() {
  return (document.getElementById("userSearch")?.value || "").trim().toLowerCase();
}

function getFilteredUsers() {
  const q = getSearchQuery();
  if (!q) return allUsers;
  return allUsers.filter(u => u.email.toLowerCase().includes(q));
}

function renderUserList() {
  const tbody = document.getElementById("userTableBody");
  const paginationEl = document.getElementById("userPagination");
  const pageInfoEl = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("pagePrev");
  const nextBtn = document.getElementById("pageNext");

  const q = getSearchQuery();
  const filtered = getFilteredUsers();
  const isSearching = q.length > 0;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = isSearching ? 0 : (currentPage - 1) * PAGE_SIZE;
  const end = isSearching ? filtered.length : start + PAGE_SIZE;
  const visible = filtered.slice(start, end);

  if (visible.length === 0) {
    const msg = isSearching ? t("no_search_results") : t("no_users");
    tbody.innerHTML = `<tr><td colspan="4" style="padding:8px; color:rgba(255,255,255,0.5);">${msg}</td></tr>`;
  } else {
    tbody.innerHTML = visible.map((u, i) => {
      const rowBg = i % 2 === 0 ? "rgba(255,255,255,0.05)" : "transparent";
      let activeCell;
      if (!u.is_active) {
        activeCell = "❌";
      } else if (u.has_logged_in) {
        activeCell = "✅";
      } else {
        activeCell = "-";
      }
      return `
        <tr style="background:${rowBg}">
          <td style="padding:6px 8px; color:white;">${u.email}</td>
          <td style="text-align:center; padding:6px 8px; color:white;">${u.is_admin ? "✅" : "-"}</td>
          <td style="text-align:center; padding:6px 8px; color:white;">${activeCell}</td>
          <td style="text-align:center; padding:6px 8px;">
            <button class="btn-table" onclick="resetPassword('${u.email}')">${t("btn_new_password")}</button>
            <button class="btn-icon" onclick="setAdmin('${u.email}', ${!u.is_admin})" title="${u.is_admin ? t("btn_remove_admin") : t("btn_make_admin")}" aria-label="${u.is_admin ? t("btn_remove_admin") : t("btn_make_admin")}" style="margin-left:6px;">${u.is_admin ? "★" : "☆"}</button>
            <button class="btn-table btn-danger" onclick="deleteUser('${u.email}')" style="margin-left:6px;">${t("btn_delete")}</button>
          </td>
        </tr>`;
    }).join("");
  }

  if (!isSearching && allUsers.length > PAGE_SIZE) {
    paginationEl.style.display = "flex";
    pageInfoEl.innerText = `${t("page_label")} ${currentPage} ${t("of_label")} ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  } else {
    paginationEl.style.display = "none";
  }
}

function onUserSearch() {
  currentPage = 1;
  renderUserList();
}

function changePage(delta) {
  const totalPages = Math.max(1, Math.ceil(getFilteredUsers().length / PAGE_SIZE));
  currentPage = Math.max(1, Math.min(totalPages, currentPage + delta));
  renderUserList();
}

async function loadUserList() {
  const tbody = document.getElementById("userTableBody");
  const resultEl = document.getElementById("userActionResult");
  setResult(resultEl, "", true);

  if (window.MOCK_USERS) {
    allUsers = window.MOCK_USERS;
    currentPage = 1;
    renderUserList();
    return;
  }

  const r = await fetch("/admin/list-users");
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:#ff5959;">${t("err_load_users")}</td></tr>`;
    return;
  }
  allUsers = await r.json();
  currentPage = 1;
  renderUserList();
}

async function resetPassword(email) {
  const resultEl = document.getElementById("userActionResult");
  const fd = new FormData();
  fd.append("email", email);
  const r = await fetch("/admin/reset-password", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    setResult(resultEl, res.email_sent
      ? `${t("password_reset_ok")} ${res.email} - ${t("email_sent_ok")}`
      : `${t("password_reset_ok")} ${res.email} - ${t("email_sent_fail")}`, true);
    loadUserList();
  } else {
    setResult(resultEl, res.detail || t("unknown_error"), false);
  }
}

async function setAdmin(email, makeAdmin) {
  const resultEl = document.getElementById("userActionResult");
  const fd = new FormData();
  fd.append("email", email);
  fd.append("is_admin", makeAdmin ? "true" : "false");
  const r = await fetch("/admin/set-admin", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    setResult(resultEl, `${res.email} ${makeAdmin ? t("admin_granted") : t("admin_removed")}`, true);
    loadUserList();
  } else {
    setResult(resultEl, res.detail || t("unknown_error"), false);
  }
}

async function deleteUser(email) {
  if (!confirm(`${t("confirm_delete")} ${email}?`)) return;
  const resultEl = document.getElementById("userActionResult");
  const fd = new FormData();
  fd.append("email", email);
  const r = await fetch("/admin/delete-user", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    setResult(resultEl, `${res.deleted} ${t("user_deleted")}`, true);
    loadUserList();
  } else {
    setResult(resultEl, res.detail || t("unknown_error"), false);
  }
}

document.getElementById("addUserForm").onsubmit = async e => {
  e.preventDefault();
  const addResultEl = document.getElementById("addUserResult");
  const fd = new FormData();
  fd.append("email", document.getElementById("newUserEmail").value);
  fd.append("is_admin", document.getElementById("newUserIsAdmin").checked ? "true" : "false");
  const r = await fetch("/admin/add-user", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    setResult(addResultEl, res.email_sent
      ? `${t("user_created")} - ${t("email_sent_ok")} (${res.email})`
      : `${t("user_created")} - ${t("email_sent_fail")} (${res.email})`, true);
    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserIsAdmin").checked = false;
    loadUserList();
  } else {
    setResult(addResultEl, res.detail || t("unknown_error"), false);
  }
};

loadUserList();

// =============================================================================
// Innloggingslogg
// =============================================================================

const LOG_PAGE_SIZE = 25;
let logPage = 1;
let logTotal = 0;
let logLoaded = false;

function toggleLog() {
  const section = document.getElementById("logSection");
  const btn = document.getElementById("toggleLogBtn");
  const visible = section.style.display !== "none";
  section.style.display = visible ? "none" : "block";
  btn.textContent = visible ? t("btn_show_log") : t("btn_hide_log");
  if (!visible && !logLoaded) {
    logLoaded = true;
    loadLoginLog();
  }
}

function formatLogDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

async function loadLoginLog() {
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = `<tr><td colspan="3" style="padding:8px; color:#888;">${t("loading_log")}</td></tr>`;

  const search   = document.getElementById("logSearch")?.value.trim() || "";
  const dateFrom = document.getElementById("logDateFrom")?.value || "";
  const dateTo   = document.getElementById("logDateTo")?.value || "";

  const params = new URLSearchParams({ page: logPage, page_size: LOG_PAGE_SIZE });
  if (search)   params.set("search",    search);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo)   params.set("date_to",   dateTo);

  const r = await fetch(`/admin/login-log?${params}`);
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:#ff5959;">${t("no_log_results")}</td></tr>`;
    return;
  }
  const data = await r.json();
  logTotal = data.total;
  const totalPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));

  if (data.entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding:8px; color:rgba(255,255,255,0.5);">${t("no_log_results")}</td></tr>`;
  } else {
    tbody.innerHTML = data.entries.map((e, i) => {
      const failed = e.success === false;
      const rowBg = failed
        ? (i % 2 === 0 ? "rgba(255,89,89,0.13)" : "rgba(255,89,89,0.07)")
        : (i % 2 === 0 ? "rgba(255,255,255,0.05)" : "transparent");
      const timeCell = `${failed ? "❌ " : ""}${formatLogDate(e.logged_at)}`;
      return `<tr style="background:${rowBg}">
        <td style="padding:6px 8px; color:${failed ? "#ff9999" : "rgba(255,255,255,0.85)"}; white-space:nowrap;">${timeCell}</td>
        <td style="padding:6px 8px; color:${failed ? "#ffbbbb" : "white"};">${e.email}</td>
        <td style="padding:6px 8px; color:rgba(255,255,255,0.6); font-family:monospace; word-break:break-all;">${e.ip_address}</td>
      </tr>`;
    }).join("");
  }

  const paginationEl = document.getElementById("logPagination");
  const pageInfoEl   = document.getElementById("logPageInfo");
  const prevBtn      = document.getElementById("logPrev");
  const nextBtn      = document.getElementById("logNext");
  const totalEl      = document.getElementById("logTotal");

  totalEl.innerText = `${t("log_total")} ${logTotal}`;

  if (totalPages > 1) {
    paginationEl.style.display = "flex";
    pageInfoEl.innerText = `${t("page_label")} ${logPage} ${t("of_label")} ${totalPages}`;
    prevBtn.disabled = logPage <= 1;
    nextBtn.disabled = logPage >= totalPages;
  } else {
    paginationEl.style.display = "none";
  }
}

function onLogSearch() {
  logPage = 1;
  loadLoginLog();
}

function changeLogPage(delta) {
  const totalPages = Math.max(1, Math.ceil(logTotal / LOG_PAGE_SIZE));
  logPage = Math.max(1, Math.min(totalPages, logPage + delta));
  loadLoginLog();
}

function resetLogFilter() {
  document.getElementById("logSearch").value = "";
  document.getElementById("logDateFrom").value = "";
  document.getElementById("logDateTo").value = "";
  logPage = 1;
  loadLoginLog();
}
