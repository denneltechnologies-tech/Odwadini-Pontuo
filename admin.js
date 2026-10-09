/* ==========================================================================
   ODWADINI MPUNTUO — Master Admin Operations Script (360 Group Ltd)
   Direct WhatsApp Outreach, Instant Status Controls & Pass Generator
   ========================================================================== */

let token = sessionStorage.getItem('odw_admin_token') || '';
let rows = [];
let typeLabels = {};
let activeType = 'all';
let currentId = null;
let pollTimer = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  $('loginForm').addEventListener('submit', onLogin);
  $('searchInput').addEventListener('input', renderTable);
  $('statusFilter').addEventListener('change', renderTable);
  $('drawerBackdrop').addEventListener('click', (e) => {
    if (e.target === $('drawerBackdrop')) closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      closePassModal();
    }
  });

  if (token) boot();
  else showLogin();
});

function showLogin() {
  $('loginScreen').style.display = 'flex';
  $('dashboard').style.display = 'none';
  if (pollTimer) clearInterval(pollTimer);
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
  btn.textContent = 'Authenticating…';

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
    toast('✓ Welcome to Odwadini Mpuntuo Operations Dashboard', false, 'gold');
  } catch (err2) {
    err.textContent = err2.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Access Dashboard';
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

  // Background auto-refresh every 25 seconds
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      await loadAll(true);
    } catch (e) { /* ignore silent error in poll */ }
  }, 25000);
}

async function loadAll(isSilent = false) {
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
    if (!isSilent) toast('Dashboard synchronized', false);
  } catch (e) {
    if (e.message !== 'Session expired' && !isSilent) toast('Failed to load data: ' + e.message, true);
  }
}

function renderStats(stats) {
  $('stTotal').textContent = stats.total || 0;
  $('stNew').textContent = (stats.byStatus && stats.byStatus['new']) || 0;
  $('stApproved').textContent = (stats.byStatus && stats.byStatus['approved']) || 0;
  $('st24').textContent = stats.last24h || 0;
}

function renderChips(stats) {
  const wrap = $('typeChips');
  wrap.innerHTML = '';
  const mk = (type, label, count) => {
    const b = document.createElement('button');
    b.className = 'chip' + (activeType === type ? ' active' : '');
    b.dataset.type = type;
    b.innerHTML = `${label} <span class="count">${count}</span>`;
    b.addEventListener('click', () => {
      activeType = type;
      renderChips(stats);
      renderTable();
    });
    wrap.appendChild(b);
  };
  mk('all', 'All Submissions', stats.total || 0);
  for (const [type, label] of Object.entries(typeLabels)) {
    mk(type, label, (stats.byType && stats.byType[type]) || 0);
  }
}

/* ------------------------------ Phone & WhatsApp Helper ------------------------------ */

function cleanPhoneForWhatsApp(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Ghanaian local format (e.g., 0241234567 -> 233241234567)
    cleaned = '233' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    cleaned = '233' + cleaned;
  }
  return cleaned;
}

function generateWhatsAppUrl(phone, name, ref) {
  const num = cleanPhoneForWhatsApp(phone);
  if (!num) return '#';
  const person = name ? name.trim() : 'there';
  const msg = `Hello ${person}! Greetings from 360 Group Ltd regarding your Odwadini Mpuntuo (Market Women Wellness & Fun Day) registration [Ref: ${ref}]. We look forward to welcoming you on Friday, 1st May at Makola Market!`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
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
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const waUrl = r.view.phone ? generateWhatsAppUrl(r.view.phone, r.view.name, r.reference) : null;
    const cleanPhone = cleanPhoneForWhatsApp(r.view.phone);

    tr.innerHTML = `
      <td><span class="ref-code">${esc(r.reference)}</span></td>
      <td>
        <span class="cell-name">${dateStr}</span>
        <div class="cell-sub">${timeStr}</div>
      </td>
      <td><span class="type-badge ${r.type === 'member' || r.type === 'partner' || r.type === 'donate' ? 'hot' : ''}">${esc(typeLabels[r.type] || r.type)}</span></td>
      <td>
        <span class="cell-name">${esc(r.view.name || 'Anonymous')}</span>
        <div class="cell-sub">${esc(truncate(r.view.detail, 60))}</div>
      </td>
      <td>
        <div class="contact-group">
          ${waUrl ? `
            <a href="${waUrl}" target="_blank" class="btn-wa" title="Open WhatsApp Chat" onclick="event.stopPropagation()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              WhatsApp
            </a>
          ` : ''}
          ${r.view.phone ? `
            <a href="tel:${cleanPhone}" class="btn-call" title="Call directly" onclick="event.stopPropagation()">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              ${esc(r.view.phone)}
            </a>
          ` : '<span class="cell-sub">No phone</span>'}
        </div>
      </td>
      <td>
        <select class="inline-status-select status-${r.status}" data-id="${r.id}" onclick="event.stopPropagation()">
          <option value="new" ${r.status === 'new' ? 'selected' : ''}>New</option>
          <option value="in-review" ${r.status === 'in-review' ? 'selected' : ''}>In review</option>
          <option value="approved" ${r.status === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="closed" ${r.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </td>
      <td style="text-align:right;">
        <div class="row-actions">
          <button class="icon-btn primary" data-act="pass" title="Generate Event Pass">Pass</button>
          <button class="icon-btn" data-act="view" title="View details">View</button>
          <button class="icon-btn danger" data-act="del" title="Delete record">Delete</button>
        </div>
      </td>
    `;

    // Inline status change listener
    const select = tr.querySelector('.inline-status-select');
    if (select) {
      select.addEventListener('change', async (ev) => {
        ev.stopPropagation();
        await updateRowStatus(r.id, select.value, select);
      });
    }

    // Row click listeners
    tr.addEventListener('click', (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act === 'del') {
        e.stopPropagation();
        deleteRow(r.id);
        return;
      }
      if (act === 'pass') {
        e.stopPropagation();
        openPassModal(r.id);
        return;
      }
      openDrawer(r.id);
    });

    tbody.appendChild(tr);
  }
}

async function updateRowStatus(id, newStatus, selectElement) {
  try {
    const res = await api(`/api/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to update');

    const row = rows.find(x => x.id === id);
    if (row) row.status = newStatus;

    if (selectElement) {
      selectElement.className = `inline-status-select status-${newStatus}`;
    }

    toast(`✓ Status updated to "${statusLabel(newStatus)}"`, false);
    // Refresh counters
    const statsRes = await api('/api/stats');
    const stats = await statsRes.json();
    renderStats(stats);
  } catch (err) {
    toast('Error updating status: ' + err.message, true);
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
  $('dMeta').innerHTML = `Submitted: ${new Date(r.createdAt).toLocaleString()}${r.updatedAt ? '<br>Last updated: ' + new Date(r.updatedAt).toLocaleString() : ''}`;

  // Quick outreach buttons in drawer
  const qa = $('dQuickActions');
  qa.innerHTML = '';
  if (r.view.phone) {
    const waUrl = generateWhatsAppUrl(r.view.phone, r.view.name, r.reference);
    const cleanPhone = cleanPhoneForWhatsApp(r.view.phone);
    qa.innerHTML = `
      <a href="${waUrl}" target="_blank" class="drawer-quick-wa">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
        WhatsApp Outreach
      </a>
      <a href="tel:${cleanPhone}" class="drawer-quick-call">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call Phone
      </a>
    `;
  }

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
    grid.innerHTML = '<div class="detail-val">No extra details captured.</div>';
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
    if (!json.ok) throw new Error(json.error || 'Failed to update');
    toast(`✓ Status updated to ${statusLabel(status)}`);
    await loadAll(true);
  } catch (err) {
    toast('Update failed: ' + err.message, true);
  }
}

async function deleteRow(id) {
  const row = rows.find(x => x.id === id);
  const name = row ? (row.view.name || row.reference) : 'this record';
  if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
  try {
    const res = await api(`/api/submissions/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Failed to delete');
    toast('Record deleted successfully');
    await loadAll(true);
  } catch (err) {
    toast('Delete failed: ' + err.message, true);
  }
}

function deleteCurrent() {
  if (!currentId) return;
  const id = currentId;
  closeDrawer();
  deleteRow(id);
}

/* ------------------------------ Participant Pass ------------------------------ */

function openPassFromDrawer() {
  if (!currentId) return;
  const id = currentId;
  closeDrawer();
  openPassModal(id);
}

function openPassModal(id) {
  const r = rows.find(x => x.id === id);
  if (!r) return;

  $('passRef').textContent = r.reference || 'MBR-2026-000000';
  $('passName').textContent = r.view.name || 'Participant';
  $('passType').textContent = typeLabels[r.type] || r.type || 'Member';
  $('passDetail').textContent = r.view.detail || r.data.market || r.data.stallLocation || 'Makola Market';

  const initials = (r.view.name || 'OM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  $('passAvatar').textContent = initials || 'OM';

  $('passModalBackdrop').style.display = 'flex';
}

function closePassModal() {
  $('passModalBackdrop').style.display = 'none';
}

function printPass() {
  window.print();
}

/* ------------------------------ CSV Export ------------------------------ */

function exportCsv() {
  const headers = ['Reference', 'Date', 'Type', 'Name', 'Phone', 'Email', 'Detail', 'Status'];
  const csvRows = [headers.join(',')];

  for (const r of filteredRows()) {
    const fields = [
      r.reference,
      new Date(r.createdAt).toISOString(),
      typeLabels[r.type] || r.type,
      `"${(r.view.name || '').replace(/"/g, '""')}"`,
      `"${(r.view.phone || '').replace(/"/g, '""')}"`,
      `"${(r.view.email || '').replace(/"/g, '""')}"`,
      `"${(r.view.detail || '').replace(/"/g, '""')}"`,
      r.status
    ];
    csvRows.push(fields.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `odwadini-mpuntuo-records-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Exported CSV successfully', false, 'gold');
}

/* ------------------------------ Toast ------------------------------ */

function toast(msg, isError = false, extraClass = '') {
  const wrap = $('toastWrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' toast-error' : '') + (extraClass ? ` toast-${extraClass}` : '');
  t.innerHTML = `<span>${isError ? '⚠️' : '🌟'}</span> <span>${esc(msg)}</span>`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    t.style.transition = 'all 0.25s ease';
    setTimeout(() => t.remove(), 250);
  }, 4000);
}

/* ------------------------------ Utilities ------------------------------ */

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
