const TOKEN_KEY = 'gastro-v3-dashboard-token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setStatus(el, message, kind) {
  el.textContent = message;
  el.hidden = !message;
  el.classList.remove('ok', 'error');
  if (kind) el.classList.add(kind);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
  const res = await fetch(path, { ...options, headers });
  let body = {};
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error(body.error || `Unerwarteter Serverfehler (HTTP ${res.status}).`);
  return body;
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function makeRow(className) {
  const row = document.createElement('article');
  row.className = className;
  return row;
}

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

const searchQueryInput = document.getElementById('search-query');
const searchButton = document.getElementById('search-button');
const searchStatus = document.getElementById('search-status');
const searchAttribution = document.getElementById('search-attribution');
const searchResultsEl = document.getElementById('search-results');
const prospectStatus = document.getElementById('prospect-status');
const prospectListEl = document.getElementById('prospect-list');
const tokenWarning = document.getElementById('token-warning');

let lastSearchResults = [];

function renderSearchResults(results) {
  clearChildren(searchResultsEl);
  lastSearchResults = results;
  for (const place of results) {
    const row = makeRow('lead-row');

    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = place.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = [place.adresse, place.website ? 'Website vorhanden' : 'Keine Website'].filter(Boolean).join(' · ');
    info.append(name, document.createElement('br'), meta);

    const importBtn = makeButton('Importieren', () => importProspect(place.placeId));

    row.append(info, importBtn);
    searchResultsEl.appendChild(row);
  }
}

function renderProspectList(prospects) {
  clearChildren(prospectListEl);
  if (prospects.length === 0) {
    setStatus(prospectStatus, 'Noch keine Prospects importiert.', null);
    return;
  }
  setStatus(prospectStatus, '', null);
  for (const prospect of prospects) {
    const row = makeRow('lead-row');

    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = prospect.name;
    const address = document.createElement('div');
    address.className = 'meta';
    address.textContent = prospect.adresse;
    const scoreLine = document.createElement('div');
    scoreLine.className = 'meta';
    const scoreText = prospect.scoring.score === null ? '' : `${prospect.scoring.score} · `;
    scoreLine.textContent = `${prospect.scoring.priority} ${scoreText ? '(' + scoreText.replace(' · ', '') + ' Punkte)' : ''}`.trim();
    const reasons = document.createElement('div');
    reasons.className = 'meta';
    reasons.textContent = prospect.scoring.reasons.join(', ');
    info.append(name, document.createElement('br'), address, document.createElement('br'), scoreLine, document.createElement('br'), reasons);

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (prospect.website) {
      actions.appendChild(makeButton('Website analysieren', () => analyzeProspect(prospect.placeId)));
    }
    const demoLink = document.createElement('a');
    demoLink.href = `/prospect-preview/${encodeURIComponent(prospect.placeId)}`;
    demoLink.target = '_blank';
    demoLink.rel = 'noopener';
    demoLink.textContent = 'Konzeptdemo öffnen';
    actions.appendChild(demoLink);

    row.append(info, actions);
    prospectListEl.appendChild(row);
  }
}

async function loadProspects() {
  try {
    const prospects = await api('/api/prospects');
    renderProspectList(prospects);
  } catch (err) {
    setStatus(prospectStatus, err.message, 'error');
  }
}

async function importProspect(placeId) {
  const place = lastSearchResults.find((p) => p.placeId === placeId);
  if (!place) return;
  try {
    await api('/api/prospects', { method: 'POST', body: JSON.stringify({ prospect: place }) });
    await loadProspects();
  } catch (err) {
    setStatus(searchStatus, err.message, 'error');
    searchStatus.hidden = false;
  }
}

async function analyzeProspect(placeId) {
  try {
    await api(`/api/prospects/${encodeURIComponent(placeId)}/analyze`, { method: 'POST' });
    await loadProspects();
  } catch (err) {
    setStatus(prospectStatus, err.message, 'error');
  }
}

async function runSearch() {
  if (!getToken()) {
    tokenWarning.hidden = false;
    return;
  }
  tokenWarning.hidden = true;
  const query = searchQueryInput.value.trim();
  searchButton.disabled = true;
  setStatus(searchStatus, 'Suche läuft …', null);
  searchAttribution.hidden = true;
  try {
    const results = await api('/api/prospects/search', { method: 'POST', body: JSON.stringify({ query }) });
    renderSearchResults(results);
    setStatus(searchStatus, `${results.length} Treffer.`, results.length ? 'ok' : null);
    searchAttribution.hidden = results.length === 0;
  } catch (err) {
    clearChildren(searchResultsEl);
    setStatus(searchStatus, err.message, 'error');
  } finally {
    searchButton.disabled = false;
  }
}

searchButton.addEventListener('click', runSearch);
if (!getToken()) tokenWarning.hidden = false;
loadProspects();
