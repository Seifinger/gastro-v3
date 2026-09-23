const app = document.getElementById('app');
const nav = document.getElementById('nav');

function getToken() { return localStorage.getItem('gastro-v3-dashboard-token') || ''; }
function setToken(t) { localStorage.setItem('gastro-v3-dashboard-token', t); }

async function api(path, options = {}) {
  const needsAuth = options.method && options.method !== 'GET';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (needsAuth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Fehler (${res.status})`);
  return body;
}

function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

function highlightNav(path) {
  nav.querySelectorAll('a').forEach((a) => {
    a.toggleAttribute('aria-current', a.getAttribute('href') === '/' + path.split('/')[1]);
    if (a.getAttribute('aria-current') === 'false') a.removeAttribute('aria-current');
  });
}

async function viewLeads() {
  const leads = await api('/leads');
  const confirmedAvg = leads.length ? Math.round(leads.filter((l) => l.completeness).reduce((s, l) => s + l.completeness.percent, 0) / leads.length) : 0;
  app.replaceChildren(el(`
    <h1>Leads</h1>
    <div class="kpi-row">
      <div class="kpi"><strong>${leads.length}</strong>Leads gesamt</div>
      <div class="kpi"><strong>${leads.filter((l) => l.valid).length}</strong>Gültige Briefings</div>
      <div class="kpi"><strong>${leads.filter((l) => l.freigegeben).length}</strong>Freigegeben</div>
      <div class="kpi"><strong>${confirmedAvg}%</strong>Ø bestätigte Felder</div>
    </div>
    <div class="lead-list">
      ${leads.map((l) => `
        <a class="lead-row" href="/lead/${l.id || ''}">
          <span><span class="name">${l.name}</span><br><span class="meta">${l.id || l.file} · ${l.hauptaktion || '–'}</span></span>
          <span class="badge ${l.valid ? 'ok' : 'warn'}">${l.valid ? 'gültig' : `${l.errorCount} Fehler`}</span>
          <span class="badge">${l.completeness ? l.completeness.percent + '% bestätigt' : '–'}</span>
        </a>`).join('') || '<p>Noch keine Leads. Unter „Neu“ anlegen.</p>'}
    </div>
  `));
}

async function viewLead(id) {
  const lead = await api(`/leads/${id}`);
  app.replaceChildren(el(`
    <h1>${lead.input.name || id}</h1>
    <p class="meta">${id} · ${lead.valid ? 'gültig' : lead.errorCount + ' Validierungsfehler'}</p>
    <p>
      <a href="/lead/${id}/edit"><button class="secondary">Bearbeiten</button></a>
      <button id="build-btn">Bauen</button>
      ${lead.built ? `<a href="/preview/${id}/" target="_blank" rel="noopener"><button class="secondary">Vorschau öffnen</button></a>` : ''}
    </p>
    <h2>Komposition</h2>
    ${lead.composedPreview ? `
      <p>Archetyp: <strong>${lead.composedPreview.archetype}</strong> · Status: <strong>${lead.composedPreview.buildStatus}</strong> · ${lead.composedPreview.sectionCount} Sektionen</p>
      <p class="meta">${lead.composedPreview.sections.join(' → ')}</p>
      ${lead.composedPreview.reasons?.length ? `<div class="status-msg error">${lead.composedPreview.reasons.join('<br>')}</div>` : ''}
    ` : '<p>Briefing ist ungültig, keine Komposition möglich.</p>'}
    <h2>Build-/Judge-Log</h2>
    <div id="build-log"></div>
  `));
  document.getElementById('build-btn').addEventListener('click', () => runBuild(id));
}

async function runBuild(id) {
  const logEl = document.getElementById('build-log');
  logEl.innerHTML = '<p class="meta">Baue…</p>';
  try {
    const result = await api(`/leads/${id}/build`, { method: 'POST' });
    if (result.ok) {
      logEl.innerHTML = `<div class="status-msg ok">Gebaut: ${result.path} (${result.archetype})</div>`;
    } else {
      const lines = (result.findings || result.errors || []).map((f) => `<div class="log-line">${f.code ? '[' + f.code + '] ' : ''}${f.message || f.path}</div>`).join('');
      logEl.innerHTML = `<div class="status-msg error">Fehlgeschlagen (${result.stage})</div>${lines}`;
    }
  } catch (err) {
    logEl.innerHTML = `<div class="status-msg error">${err.message}</div>`;
  }
}

const SCALAR_FIELDS = ['konzept', 'usp', 'zielgaeste', 'signaturgericht', 'ambienteCharakter', 'wunschschrift', 'telefon', 'adresse'];

function statusField(name, field) {
  const f = field || { status: 'draft', value: null };
  return `
    <label>${name}</label>
    <input data-field="${name}" data-part="value" value="${(f.value ?? '').toString().replace(/"/g, '&quot;')}">
    <select data-field="${name}" data-part="status">
      ${['confirmed', 'draft', 'unknown'].map((s) => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>`;
}

async function viewEditForm(id, isNew) {
  const lead = isNew ? { input: { id: '', name: '', kueche: 'international', ort: '', hauptaktion: 'informieren' } } : await api(`/leads/${id}`);
  const input = lead.input;
  const complexJson = JSON.stringify({
    fotos: input.fotos, speisekarte: input.speisekarte, testimonials: input.testimonials, historie: input.historie,
    oeffnungszeiten: input.oeffnungszeiten, referenzUrls: input.referenzUrls, goNos: input.goNos, preisklasse: input.preisklasse,
    primaerfarbe: input.primaerfarbe, logoUrl: input.logoUrl, video: input.video, freigabe: input.freigabe,
  }, null, 2);
  app.replaceChildren(el(`
    <h1>${isNew ? 'Neuer Lead' : 'Bearbeiten: ' + (input.name || id)}</h1>
    <form id="lead-form">
      <label>ID (Slug)</label>
      <input name="id" value="${input.id || ''}" ${isNew ? '' : 'readonly'} pattern="[a-z0-9]+(-[a-z0-9]+)*" required>
      <label>Name</label>
      <input name="name" value="${(input.name || '').replace(/"/g, '&quot;')}" required>
      <label>Küche</label>
      <input name="kueche" value="${input.kueche || ''}" required>
      <label>Ort</label>
      <input name="ort" value="${input.ort || ''}" required>
      <label>Hauptaktion</label>
      <select name="hauptaktion">
        ${['reservieren', 'bestellen', 'anrufen', 'informieren'].map((a) => `<option ${input.hauptaktion === a ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
      <h2>Weitere Angaben (Wert + Herkunftsstatus)</h2>
      ${SCALAR_FIELDS.map((f) => statusField(f, input[f])).join('')}
      <h2>Erweiterte Felder (JSON: Fotos, Speisekarte, Zitate, Historie, Öffnungszeiten, Freigabe, …)</h2>
      <textarea name="complex" spellcheck="false">${complexJson}</textarea>
      <p><button type="submit">Speichern</button></p>
      <div id="form-status"></div>
    </form>
  `));
  document.getElementById('lead-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const payload = {
      id: form.id.value.trim(), name: form.name.value.trim(), kueche: form.kueche.value.trim(),
      ort: form.ort.value.trim(), hauptaktion: form.hauptaktion.value,
    };
    for (const f of SCALAR_FIELDS) {
      const value = form.querySelector(`[data-field="${f}"][data-part="value"]`).value;
      const status = form.querySelector(`[data-field="${f}"][data-part="status"]`).value;
      payload[f] = { status, value: value || null };
    }
    let complex;
    try { complex = JSON.parse(form.complex.value); } catch { complex = null; }
    if (!complex) { document.getElementById('form-status').innerHTML = '<div class="status-msg error">Ungültiges JSON im Feld „Erweiterte Felder“.</div>'; return; }
    Object.assign(payload, complex);
    try {
      await api(isNew ? '/leads' : `/leads/${id}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(payload) });
      window.location.href = `/lead/${payload.id}`;
    } catch (err) {
      document.getElementById('form-status').innerHTML = `<div class="status-msg error">${err.message}</div>`;
    }
  });
}

async function viewSettings() {
  const info = await api('/einstellungen');
  app.replaceChildren(el(`
    <h1>Einstellungen</h1>
    <h2>Dashboard-Token</h2>
    <p class="meta">Wird nur lokal im Browser gespeichert (localStorage), nie an den Server zurückgegeben.</p>
    <input id="token-input" type="password" value="${getToken() ? '••••••••' : ''}" placeholder="Dashboard-Token einfügen">
    <p><button id="save-token">Token speichern</button></p>
    <h2>Server-Konfiguration</h2>
    <div class="kpi-row">
      <div class="kpi"><strong>${info.dashboardTokenConfigured ? 'ja' : 'nein'}</strong>DASHBOARD_TOKEN gesetzt</div>
      <div class="kpi"><strong>${info.wirtSessionSecretConfigured ? 'ja' : 'nein'}</strong>WIRT_SESSION_SECRET gesetzt</div>
      <div class="kpi"><strong>${info.vapidConfigured ? 'ja' : 'nein'}</strong>Web Push konfiguriert</div>
      <div class="kpi"><strong>${info.telegramConfigured ? 'ja' : 'nein'}</strong>Telegram konfiguriert</div>
    </div>
    <p class="meta">PUBLIC_BASE_URL: ${info.publicBaseUrl || '(nicht gesetzt)'} · WIRT_API_BASE_URL: ${info.wirtApiBaseUrl || '(nicht gesetzt)'}</p>
    <h2>Wirt-Portal-Passwort setzen (bei Go-live)</h2>
    <form id="wirt-pw-form">
      <label>Betriebs-Slug</label>
      <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*">
      <label>Neues Passwort (mind. 10 Zeichen)</label>
      <input name="password" type="password" minlength="10" required>
      <p><button type="submit">Passwort setzen</button></p>
      <div id="wirt-pw-status"></div>
    </form>
  `));
  document.getElementById('save-token').addEventListener('click', () => {
    const value = document.getElementById('token-input').value;
    if (value && value !== '••••••••') setToken(value);
    alert('Token gespeichert.');
  });
  document.getElementById('wirt-pw-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    try {
      await api('/einstellungen/wirt-passwort', { method: 'POST', body: JSON.stringify({ slug: form.slug.value, password: form.password.value }) });
      document.getElementById('wirt-pw-status').innerHTML = '<div class="status-msg ok">Passwort gesetzt.</div>';
      form.reset();
    } catch (err) {
      document.getElementById('wirt-pw-status').innerHTML = `<div class="status-msg error">${err.message}</div>`;
    }
  });
}

async function router() {
  const path = window.location.pathname;
  highlightNav(path);
  try {
    if (path === '/' || path === '/leads') return await viewLeads();
    if (path === '/neu') return await viewEditForm(null, true);
    if (path === '/einstellungen') return await viewSettings();
    const editMatch = path.match(/^\/lead\/([^/]+)\/edit$/);
    if (editMatch) return await viewEditForm(editMatch[1], false);
    const leadMatch = path.match(/^\/lead\/([^/]+)$/);
    if (leadMatch) return await viewLead(leadMatch[1]);
    if (path.match(/^\/lead\/([^/]+)\/build$/)) return await viewLead(path.split('/')[2]);
    app.replaceChildren(el('<h1>Nicht gefunden</h1>'));
  } catch (err) {
    app.replaceChildren(el(`<div class="status-msg error">${err.message}</div>`));
  }
}

document.body.addEventListener('click', (ev) => {
  const a = ev.target.closest('a');
  if (!a || a.target === '_blank' || a.origin !== window.location.origin) return;
  ev.preventDefault();
  window.history.pushState({}, '', a.getAttribute('href'));
  router();
});
window.addEventListener('popstate', router);
router();
