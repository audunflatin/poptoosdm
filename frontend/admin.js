async function loadUserList() {
  const tbody = document.getElementById("userTableBody");
  const resultEl = document.getElementById("userActionResult");
  resultEl.innerText = "";

  const r = await fetch("/admin/list-users");
  if (!r.ok) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;">${t("err_load_users")}</td></tr>`;
    return;
  }
  const users = await r.json();

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:8px; color:#888;">${t("no_users")}</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, i) => {
    const rowBg = i % 2 === 0 ? "#f9f9f9" : "#fff";
    let activeCell;
    if (!u.is_active) {
      activeCell = "❌";
    } else if (u.has_logged_in) {
      activeCell = "✅";
    } else {
      activeCell = "—";
    }
    return `
      <tr style="background:${rowBg}">
        <td style="padding:6px 8px;">${u.email}</td>
        <td style="text-align:center; padding:6px 8px;">${u.is_admin ? "✅" : "—"}</td>
        <td style="text-align:center; padding:6px 8px;">${activeCell}</td>
        <td style="text-align:center; padding:6px 8px;">
          <button class="btn-table" onclick="resetPassword('${u.email}')">${t("btn_new_password")}</button>
          <button class="btn-table btn-danger" onclick="deleteUser('${u.email}')" style="margin-left:6px;">${t("btn_delete")}</button>
        </td>
      </tr>`;
  }).join("");
}

async function resetPassword(email) {
  const resultEl = document.getElementById("userActionResult");
  const fd = new FormData();
  fd.append("email", email);
  const r = await fetch("/admin/reset-password", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    resultEl.innerText = res.email_sent
      ? `✅ ${t("password_reset_ok")} ${res.email} — ${t("email_sent_ok")}`
      : `✅ ${t("password_reset_ok")} ${res.email} — ${t("email_sent_fail")}`;
    loadUserList();
  } else {
    resultEl.innerText = `❌ ${res.detail || t("unknown_error")}`;
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
    resultEl.innerText = `✅ ${res.deleted} ${t("user_deleted")}`;
    loadUserList();
  } else {
    resultEl.innerText = `❌ ${res.detail || t("unknown_error")}`;
  }
}

document.getElementById("addUserForm").onsubmit = async e => {
  e.preventDefault();
  const fd = new FormData();
  fd.append("email", document.getElementById("newUserEmail").value);
  fd.append("is_admin", document.getElementById("newUserIsAdmin").checked ? "true" : "false");
  const r = await fetch("/admin/add-user", { method: "POST", body: fd });
  const res = await r.json();
  if (res.ok) {
    document.getElementById("addUserResult").innerText = res.email_sent
      ? `✅ ${t("user_created")} — ${t("email_sent_ok")} (${res.email})`
      : `✅ ${t("user_created")} — ${t("email_sent_fail")} (${res.email})`;
    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserIsAdmin").checked = false;
    loadUserList();
  } else {
    document.getElementById("addUserResult").innerText = `❌ ${res.detail || t("unknown_error")}`;
  }
};

loadUserList();
