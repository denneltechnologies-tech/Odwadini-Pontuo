const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'odw-admin-2026';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

const SUBMISSION_TYPES = {
  member: 'Membership Registration',
  partner: 'Partnership Inquiry',
  donate: 'Donation Pledge',
  contact: 'Contact Inquiry',
  newsletter: 'Newsletter Signup',
  lead: 'Landing Page Lead'
};

const REF_PREFIX = {
  member: 'MBR',
  partner: 'PRN',
  donate: 'GIV',
  contact: 'MSG',
  newsletter: 'NL',
  lead: 'LD'
};

const VALID_STATUSES = ['new', 'in-review', 'approved', 'closed'];

/* ----------------------------- Storage Layer ----------------------------- */

let submissions = [];
let writeQueue = Promise.resolve();

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (!Array.isArray(submissions)) submissions = [];
    } else {
      submissions = [];
      persistSync();
    }
  } catch (err) {
    console.error('Failed to load submissions store, starting fresh:', err.message);
    submissions = [];
  }
}

function persistSync() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(submissions, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function persist() {
  writeQueue = writeQueue.then(() => {
    try { persistSync(); }
    catch (err) { console.error('Failed to persist submissions:', err.message); }
  });
  return writeQueue;
}

function makeReference(type) {
  const prefix = REF_PREFIX[type] || 'REF';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${crypto.randomInt(100000, 999999)}`;
}

/* ------------------------------ Auth Layer ------------------------------- */

const activeTokens = new Map(); // token -> expiresAt
const loginAttempts = new Map(); // ip -> { count, resetAt }

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function revokeToken(token) {
  activeTokens.delete(token);
}

function isAuthorized(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !activeTokens.has(token)) return false;
  const expiresAt = activeTokens.get(token);
  if (Date.now() > expiresAt) {
    activeTokens.delete(token);
    return false;
  }
  return true;
}

function pruneTokens() {
  const now = Date.now();
  for (const [token, expiresAt] of activeTokens) {
    if (now > expiresAt) activeTokens.delete(token);
  }
}
setInterval(pruneTokens, 10 * 60 * 1000).unref();

function loginRateLimited(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) { loginAttempts.delete(ip); return false; }
  return entry.count >= 5;
}

function recordFailedLogin(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + 10 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
}

/* ------------------------------ HTTP Helpers ----------------------------- */

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function requireAdmin(req, res) {
  if (isAuthorized(req)) return true;
  sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  return false;
}

function flattenForDisplay(sub) {
  const d = sub.data || {};
  const keys = Object.keys(d);
  const get = (re) => {
    const k = keys.find((key) => re.test(key));
    return k ? String(d[k]) : '';
  };

  let name = [d.firstName, d.lastName].filter(Boolean).join(' ');
  if (!name) name = get(/^(name|fullName)$|Name$/) || get(/company|organization/i) || d.email || '—';

  let detail = '';
  const detailPatterns = [/tier|package|category|interest/i, /type/i, /subject|role|sector/i, /amount|price/i, /message|note|details/i];
  for (const p of detailPatterns) {
    detail = get(p);
    if (detail) break;
  }

  return {
    name,
    email: get(/email/i),
    phone: get(/phone|whatsapp/i),
    detail
  };
}

function toCsv(rows) {
  const cols = ['reference', 'createdAt', 'type', 'status', 'name', 'email', 'phone', 'detail', 'allFields'];
  const escape = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push([
      r.reference,
      r.createdAt,
      SUBMISSION_TYPES[r.type] || r.type,
      r.status,
      r.view.name,
      r.view.email,
      r.view.phone,
      r.view.detail,
      escape(JSON.stringify(r.data))
    ].map(escape).join(','));
  }
  return lines.join('\r\n');
}

/* ------------------------------ API Router ------------------------------- */

async function handleApi(req, res, pathname) {
  const method = req.method;

  // POST /api/admin/login
  if (method === 'POST' && pathname === '/api/admin/login') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (loginRateLimited(ip)) {
      sendJson(res, 429, { ok: false, error: 'Too many attempts. Try again in 10 minutes.' });
      return;
    }
    const body = await readBody(req);
    const password = String(body.password || '');
    const valid = password.length > 0 && password === ADMIN_PASSWORD;
    if (!valid) {
      recordFailedLogin(ip);
      sendJson(res, 401, { ok: false, error: 'Invalid password' });
      return;
    }
    loginAttempts.delete(ip);
    const token = issueToken();
    sendJson(res, 200, { ok: true, token, expiresAt: new Date(activeTokens.get(token)).toISOString() });
    return;
  }

  // POST /api/admin/logout
  if (method === 'POST' && pathname === '/api/admin/logout') {
    const header = req.headers['authorization'] || '';
    if (header.startsWith('Bearer ')) revokeToken(header.slice(7));
    sendJson(res, 200, { ok: true });
    return;
  }

  // POST /api/submissions  (public — anyone signing up)
  if (method === 'POST' && pathname === '/api/submissions') {
    const body = await readBody(req);
    const type = String(body.type || '');
    if (!SUBMISSION_TYPES[type]) {
      sendJson(res, 400, { ok: false, error: 'Invalid submission type' });
      return;
    }
    const data = body.data && typeof body.data === 'object' ? body.data : {};
    const record = {
      id: 'sub_' + crypto.randomBytes(8).toString('hex'),
      reference: makeReference(type),
      type,
      status: 'new',
      data,
      ua: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    };
    submissions.push(record);
    await persist();
    sendJson(res, 201, { ok: true, id: record.id, reference: record.reference });
    return;
  }

  // Everything below requires admin auth
  if (method === 'GET' && pathname === '/api/stats') {
    if (!requireAdmin(req, res)) return;
    const byType = {};
    for (const t of Object.keys(SUBMISSION_TYPES)) byType[t] = 0;
    const byStatus = { new: 0, 'in-review': 0, approved: 0, closed: 0 };
    const now = Date.now();
    let last24h = 0, last7d = 0;
    for (const s of submissions) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      const age = now - new Date(s.createdAt).getTime();
      if (age <= 24 * 60 * 60 * 1000) last24h++;
      if (age <= 7 * 24 * 60 * 60 * 1000) last7d++;
    }
    sendJson(res, 200, {
      ok: true,
      total: submissions.length,
      last24h,
      last7d,
      byType,
      byStatus,
      typeLabels: SUBMISSION_TYPES
    });
    return;
  }

  // GET /api/submissions/export  (CSV)
  if (method === 'GET' && pathname === '/api/submissions/export') {
    if (!requireAdmin(req, res)) return;
    const url = new URL(req.url, 'http://localhost');
    const type = url.searchParams.get('type');
    let rows = submissions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (type && SUBMISSION_TYPES[type]) rows = rows.filter((s) => s.type === type);
    const csv = toCsv(rows.map((r) => ({ ...r, view: flattenForDisplay(r) })));
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="odwadini-submissions-${new Date().toISOString().slice(0, 10)}.csv"`
    });
    res.end(csv);
    return;
  }

  // GET /api/submissions?type=
  if (method === 'GET' && pathname === '/api/submissions') {
    if (!requireAdmin(req, res)) return;
    const url = new URL(req.url, 'http://localhost');
    const type = url.searchParams.get('type');
    let rows = submissions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (type && SUBMISSION_TYPES[type]) rows = rows.filter((s) => s.type === type);
    sendJson(res, 200, { ok: true, submissions: rows.map((s) => ({ ...s, view: flattenForDisplay(s) })) });
    return;
  }

  // PATCH /api/submissions/:id  { status }
  const patchMatch = pathname.match(/^\/api\/submissions\/(sub_[a-f0-9]+)$/);
  if (method === 'PATCH' && patchMatch) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const record = submissions.find((s) => s.id === patchMatch[1]);
    if (!record) { sendJson(res, 404, { ok: false, error: 'Not found' }); return; }
    if (VALID_STATUSES.includes(body.status)) {
      record.status = body.status;
      record.updatedAt = new Date().toISOString();
      await persist();
    }
    sendJson(res, 200, { ok: true, submission: record });
    return;
  }

  // DELETE /api/submissions/:id
  if (method === 'DELETE' && patchMatch) {
    if (!requireAdmin(req, res)) return;
    const idx = submissions.findIndex((s) => s.id === patchMatch[1]);
    if (idx === -1) { sendJson(res, 404, { ok: false, error: 'Not found' }); return; }
    submissions.splice(idx, 1);
    await persist();
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Unknown API endpoint' });
}

/* ---------------------------- Static Handler ----------------------------- */

function serveStatic(req, res, pathname) {
  let reqPath = decodeURIComponent(pathname.split('?')[0].split('#')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/admin.html';
  if (['/landing', '/lead', '/join'].includes(reqPath)) reqPath = '/landing.html';

  // Normalize path and prevent directory traversal
  const normalized = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Access Denied');
    return;
  }

  // Security guard: never serve sensitive files, data folder, backend code, or dotfiles
  const rel = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
  if (
    rel.startsWith('data/') ||
    rel === 'data' ||
    rel === 'server.js' ||
    rel === 'package.json' ||
    rel.startsWith('.git') ||
    rel.startsWith('.') ||
    rel.includes('/.')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Access Denied');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  });
}

/* -------------------------------- Server --------------------------------- */

loadStore();

const server = http.createServer(async (req, res) => {
  const pathname = decodeURI(req.url.split('?')[0].split('#')[0]);

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }
    serveStatic(req, res, pathname);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message || 'Bad request' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Odwadini Mpuntuo server running at http://localhost:${PORT}/`);
  console.log(`Admin portal: http://localhost:${PORT}/admin (password: ${ADMIN_PASSWORD})`);
});
