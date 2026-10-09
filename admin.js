/* Odwadini Mpuntuo Admin Portal (360 Group Ltd) */
let token = sessionStorage.getItem('odw_admin_token') || '';
let rows = [];
let typeLabels = {};
let activeType = 'all';
let currentId = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  $('loginForm').addEventListener('submit', onLogin);
  $('searchInput').addEventListener('input', renderTable);
  $('statusFilter').addEventListener('change', renderTable);
  $('drawerBackdrop').addEventListener('click', (e) => {
    if (e.target === $('drawerBackdrop')) closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  if (token) boot();
  else showLogin();
});

function showLogin() {
  $('loginScreen').style.display = 'flex';
  $('dashboard').style.display = 'none';
}

function showDashboard() {
  $('loginScreen').style.display = 'none';
  $('dashboard').style.display = 'block';
}

/* ------------------------------ Auth ------------------------------ */

async function onLogin(e) {
  e.preventDefault();
  const btn = $('loginBtn');
  const err = $('loginError');
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('adminPassword').value })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Login failed');
    token = json.token;
    sessionStorage.setItem('odw_admin_token', token);
    $('adminPassword').value = '';
    boot();
  } catch (err2) {
    err.textContent = err2.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() });
  } catch (e) { /* ignore */ }
  token = '';
  sessionStorage.removeItem('odw_admin_token');
  showLogin();
}

function authHeaders() {
  return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
}

async function api(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  if (res.status === 401) {
    token = '';
    sessionStorage.removeItem('odw_admin_token');
    showLogin();
    throw new Error('Session expired');
  }
  return res;
}

/* ------------------------------ Boot / Load ------------------------------ */

async function boot() {
  showDashboard();
  await loadAll();
}

async function loadAll() {
  try {
    const [statsRes, listRes] = await Promise.all([api('/api/stats'), api('/api/submissions')]);
    const stats = await statsRes.json();
    const list = await listRes.json();
    if (!list.ok) return;

    typeLabels = stats.typeLabels || {};
    renderStats(stats);
    renderChips(stats);
    rows = list.submissions;
    renderTable();
  } catch (e) {
    if (e.message !== 'Session expired') toast('Failed to load data: ' + e.message, true);
  }
}

function renderStats(stats) {
  $('stTotal').textContent = stats.total;
  $('stNew').textContent = (stats.byStatus && stats.byStatus['new']) || 0;
  $('st24').textContent = stats.last24h;
  $('st7').textContent = stats.last7d;
}

function renderChips(stats) {
  const wrap = $('typeChips');
  wrap.innerHTML = '';
  const mk = (type, label, count) => {
    const b = document.createElement('button');
    b.className = 'chip' + (activeType === type ? ' active' : '');
    b.dataset.type = type;
    b.innerHTML = `${label}<span class="count">${count}</span>`;
    b.addEventListener('click', () => {
      activeType = type;
      renderChips(stats);
      renderTable();
    });
    wrap.appendChild(b);
  };
  mk('all', 'All', stats.total);
  for (const [type, label] of Object.entries(typeLabels)) {
    mk(type, label, stats.byType[type] || 0);
  }
}

/* ------------------------------ Table ------------------------------ */

function filteredRows() {
  const term = ($('searchInput').value || '').toLowerCase().trim();
  const status = $('statusFilter').value;
  return rows.filter((r) => {
    if (activeType !== 'all' && r.type !== activeType) return false;
    if (status !== 'all' && r.status !== status) return false;
    if (!term) return true;
    const hay = [r.reference, r.view.name, r.view.email, r.view.phone, r.view.detail, JSON.stringify(r.data)]
      .join(' ').toLowerCase();
    return hay.includes(term);
  });
}

function renderTable() {
  const tbody = $('tableBody');
  const list = filteredRows();
  tbody.innerHTML = '';

  $('emptyState').style.display = list.length ? 'none' : 'block';

  for (const r of list) {
    const tr = document.createElement('tr');
    const date = new Date(r.createdAt);
    tr.innerHTML = `
      <td><span class="ref-code">${esc(r.reference)}</span></td>
      <td><span class="cell-name">${date.toLocaleDateString()}</span><div class="cell-sub">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></td>
      <td><span class="type-badge ${r.type === 'member' || r.type === 'partner' || r.type === 'donate' ? 'hot' : ''}">${esc(typeLabels[r.type] || r.type)}</span></td>
      <td><span class="cell-name">${esc(r.view.name)}</span></td>
      <td>${esc(r.view.email || '—')}${r.view.phone ? `<div class="cell-sub">${esc(r.view.phone)}</div>` : ''}</td>
      <td>${esc(truncate(r.view.detail, 70))}</td>
      <td><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-act="view">View</button>
          <button class="icon-btn danger" data-act="del">Delete</button>
        </div>
      </td>
    `;
    tr.addEventListener('click', (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'del') { e.stopPropagation(); deleteRow(r.id); return; }
      openDrawer(r.id);
    });
    tbody.appendChild(tr);
  }
}

function statusLabel(s) {
  return { 'new': 'New', 'in-review': 'In review', 'approved': 'Approved', 'closed': 'Closed' }[s] || s;
}

/* ------------------------------ Drawer ------------------------------ */

function openDrawer(id) {
  const r = rows.find((x) => x.id === id);
  if (!r) return;
  currentId = id;

  $('dRef').textContent = r.reference;
  $('dTitle').textContent = typeLabels[r.type] || r.type;
  $('dStatus').value = r.status;
  $('dMeta').innerHTML = `Submitted ${new Date(r.createdAt).toLocaleString()}${r.updatedAt ? ' · Updated ' + new Date(r.updatedAt).toLocaleString() : ''}`;

  const grid = $('dFields');
  grid.innerHTML = '';
  for (const [key, val] of Object.entries(r.data || {})) {
    if (val === '' || val == null) continue;
    const item = document.createElement('div');
    item.className = 'detail-item';
    const k = document.createElement('div');
    k.className = 'detail-key';
    k.textContent = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
    const v = document.createElement('div');
    v.className = 'detail-val';
    v.textContent = String(val);
    item.appendChild(k);
    item.appendChild(v);
    grid.appendChild(item);
  }
  if (!grid.children.length) {
    grid.innerHTML = '<div class="detail-val">No details captured.</div>';
  }

  $('drawerBackdrop').classList.add('open');
}

function closeDrawer() {
  $('drawerBackdrop').classList.remove('open');
  currentId = null;
}

async function updateStatus() {
  if (!currentId) return;
  const status = $('dStatus').value;
  try {
    const res = await api(`/api/submissions/${currentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.ok) {
      const r = rows.find((x) => x.id === currentId);
      if (r) r.status = status;
      renderTable();
      toast('Status updated to ' + statusLabel(status));
    }
  } catch (e) {
    if (e.message !== 'Session expired') toast(e.message, true);
  }
}

async function deleteCurrent() {
  if (!currentId) return;
  await deleteRow(currentId, true);
}

async function deleteRow(id, fromDrawer) {
  const rec = rows.find((x) => x.id === id);
  const label = rec ? rec.reference : 'record';
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
  try {
    const res = await api(`/api/submissions/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) {
      rows = rows.filter((x) => x.id !== id);
      renderTable();
      if (fromDrawer) closeDrawer();
      toast(`${label} deleted`);
      loadStatsOnly();
    }
  } catch (e) {
    if (e.message !== 'Session expired') toast(e.message, true);
  }
}

async function loadStatsOnly() {
  try {
    const res = await api('/api/stats');
    renderStats(await res.json());
  } catch (e) { /* ignore */ }
}

/* ------------------------------ Export ------------------------------ */

async function exportCsv() {
  try {
    const res = await api('/api/submissions/export' + (activeType !== 'all' ? `?type=${activeType}` : ''));
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `odwadini-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('CSV exported');
  } catch (e) {
    if (e.message !== 'Session expired') toast(e.message, true);
  }
}

/* ------------------------------ Utils ------------------------------ */

function toast(msg, isErr) {
  const wrap = $('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}
