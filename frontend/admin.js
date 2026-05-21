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
