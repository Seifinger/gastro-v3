function csrfToken() {
  const match = document.cookie.match(/(?:^|; )wirt_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken(), ...(options.headers || {}) },
  });
  if (res.status === 401) { window.location.href = '/login.html'; throw new Error('Nicht angemeldet'); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Fehler');
  return res.json();
}

async function loadKpis() {
  const kpis = await api('/uebersicht');
  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><strong>${kpis.reservierungenHeute}</strong>Reservierungen heute</div>
    <div class="kpi"><strong>${kpis.reservierungenOffen}</strong>Offene Reservierungen</div>
    <div class="kpi"><strong>${kpis.bestellungenOffen}</strong>Offene Bestellungen</div>
    <div class="kpi"><strong>${kpis.tischeGesamt}</strong>Tische</div>`;
}

async function loadReservierungen() {
  const sort = document.getElementById('sort').value;
  const list = await api(`/reservierungen?sort=${sort}`);
  const tbody = document.querySelector('#reservierungen-table tbody');
  tbody.innerHTML = list.map((r) => `
    <tr>
      <td>${r.name}</td><td>${r.datum}</td><td>${r.uhrzeit}</td><td>${r.personen}</td><td>${r.status}</td>
      <td>
        <button data-confirm="${r.id}" ${r.status === 'bestaetigt' ? 'disabled' : ''}>Bestätigen</button>
        <button class="secondary" data-cancel="${r.id}" ${r.status === 'abgesagt' ? 'disabled' : ''}>Absagen</button>
      </td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-confirm]').forEach((btn) => btn.addEventListener('click', () => setReservationStatus(btn.dataset.confirm, 'bestaetigt')));
  tbody.querySelectorAll('[data-cancel]').forEach((btn) => btn.addEventListener('click', () => setReservationStatus(btn.dataset.cancel, 'abgesagt')));
}

async function setReservationStatus(id, status) {
  await api(`/reservierungen/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
  loadReservierungen();
  loadKpis();
}

async function loadBestellungen() {
  const list = await api('/bestellungen');
  ['neu', 'zubereitung', 'bereit'].forEach((status) => {
    const col = document.querySelector(`[data-col="${status}"]`);
    const items = list.filter((b) => b.status === status);
    col.innerHTML = items.map((b) => `
      <div class="order-card">
        <strong>${b.nummer}</strong> – ${b.name}<br>
        ${b.positionen.map((p) => `${p.menge}× ${p.name}`).join(', ')}<br>
        Abholzeit: ${b.bestaetigteAbholzeit || b.abholzeit}<br>
        ${status === 'neu' ? `<button data-confirm-order="${b.id}">Bestätigen</button>` : ''}
        ${status === 'zubereitung' ? `<button data-ready="${b.id}">Bereit</button>` : ''}
        ${status === 'bereit' ? `<button data-picked-up="${b.id}">Abgeholt</button>` : ''}
        <button class="secondary" data-noshow="${b.id}">Nicht erschienen</button>
      </div>`).join('') || '<p>Keine.</p>';
  });
  document.querySelectorAll('[data-confirm-order]').forEach((btn) => btn.addEventListener('click', async () => {
    const abholzeit = prompt('Abholzeit bestätigen (HH:MM):');
    if (!abholzeit) return;
    await api(`/bestellungen/${btn.dataset.confirmOrder}/bestaetigen`, { method: 'POST', body: JSON.stringify({ abholzeit }) });
    loadBestellungen();
  }));
  document.querySelectorAll('[data-ready]').forEach((btn) => btn.addEventListener('click', async () => {
    await api(`/bestellungen/${btn.dataset.ready}/status`, { method: 'POST', body: JSON.stringify({ status: 'bereit' }) });
    loadBestellungen();
  }));
  document.querySelectorAll('[data-picked-up]').forEach((btn) => btn.addEventListener('click', async () => {
    await api(`/bestellungen/${btn.dataset.pickedUp}/status`, { method: 'POST', body: JSON.stringify({ status: 'abgeholt' }) });
    loadBestellungen();
  }));
  document.querySelectorAll('[data-noshow]').forEach((btn) => btn.addEventListener('click', async () => {
    const betrag = prompt('Ausfallbetrag bestätigen (€):', '0');
    if (betrag === null) return;
    await api(`/bestellungen/${btn.dataset.noshow}/no-show`, { method: 'POST', body: JSON.stringify({ betrag: Number(betrag) }) });
    alert(`Quittung: /api/bestellungen/${btn.dataset.noshow}/quittung.pdf`);
    loadBestellungen();
  }));
}

document.getElementById('sort').addEventListener('change', loadReservierungen);
document.getElementById('logout').addEventListener('click', async () => { await fetch('/logout', { method: 'POST' }); window.location.href = '/login.html'; });

document.getElementById('wartezeit-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  await api('/einstellungen/wartezeit', { method: 'POST', body: JSON.stringify({ minuten: Number(document.getElementById('wartezeit').value) }) });
});
document.getElementById('telegram-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  await api('/einstellungen/telegram', { method: 'POST', body: JSON.stringify({ chatId: document.getElementById('telegramChatId').value }) });
});
document.getElementById('noshow-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  await api('/einstellungen/no-show', {
    method: 'POST',
    body: JSON.stringify({
      aktiv: document.getElementById('noShowAktiv').checked,
      gebuehrBetrag: Number(document.getElementById('noShowGebuehr').value || 0),
      stornofensterMinuten: Number(document.getElementById('noShowFenster').value || 30),
      warnSchwelle: Number(document.getElementById('noShowSchwelle').value || 2),
    }),
  });
});

document.getElementById('enable-push').addEventListener('click', async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) { alert('Push wird von diesem Browser nicht unterstützt.'); return; }
  const reg = await navigator.serviceWorker.register('/service-worker.js');
  const { publicKey } = await api('/push/public-key');
  if (!publicKey) { alert('Push ist serverseitig noch nicht konfiguriert (VAPID-Schlüssel fehlen).'); return; }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
  await api('/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
  alert('Push-Benachrichtigungen aktiviert.');
});

function connectEvents() {
  const es = new EventSource('/api/events');
  es.addEventListener('reservierung', () => { loadReservierungen(); loadKpis(); });
  es.addEventListener('bestellung', () => { loadBestellungen(); loadKpis(); });
  es.onerror = () => { es.close(); setTimeout(connectEvents, 4000); };
}

loadKpis();
loadReservierungen();
loadBestellungen();
connectEvents();
