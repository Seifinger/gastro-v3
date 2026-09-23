import { escapeHtml, escapeAttr, confirmed, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

function parsePrice(price) {
  const n = Number(String(price ?? '').replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('order-embed');
  const items = confirmed(briefing.speisekarte) || [];
  const slug = briefing.id;
  const apiBase = (ctx.apiBase || '').replace(/\/$/, '');
  const orderEndpoint = `${apiBase}/betrieb/${encodeURIComponent(slug)}/bestellung`;
  const configEndpoint = `${apiBase}/betrieb/${encodeURIComponent(slug)}/konfiguration`;
  const rows = items.map((m, i) => {
    const price = parsePrice(m.price);
    return `<div class="bp-item" data-item data-name="${escapeAttr(m.name)}" data-price="${price}">
      <div><p class="bp-item-name">${escapeHtml(m.name)}</p><p class="bp-item-price">${m.price ? escapeHtml(m.price) : ''}</p></div>
      <div class="bp-stepper">
        <button type="button" data-decrement aria-label="Weniger ${escapeAttr(m.name)}">−</button>
        <span class="bp-qty" data-qty aria-live="polite">0</span>
        <button type="button" data-increment aria-label="Mehr ${escapeAttr(m.name)}">+</button>
      </div>
    </div>`;
  }).join('');
  const html = items.length ? `
<section class="${scope}" aria-label="Online bestellen" id="bestellen" data-order-endpoint="${escapeAttr(orderEndpoint)}" data-config-endpoint="${escapeAttr(configEndpoint)}">
  <h2>Online bestellen</h2>
  ${rows}
  <div class="bp-summary"><span>Gesamt</span><span data-total>0,00&nbsp;€</span></div>
  <form class="bp-checkout" data-order-form novalidate>
    <div class="bp-field"><label for="${scope}-name">Name</label><input id="${scope}-name" name="name" type="text" autocomplete="name" required></div>
    <div class="bp-field"><label for="${scope}-telefon">Telefon</label><input id="${scope}-telefon" name="telefon" type="tel" autocomplete="tel" required></div>
    <div class="bp-field"><label for="${scope}-abholzeit">Abholzeit</label><input id="${scope}-abholzeit" name="abholzeit" type="time" required></div>
    <div class="bp-consent" data-noshow-consent hidden>
      <input type="checkbox" id="${scope}-noshow" name="noShowZustimmung">
      <label for="${scope}-noshow" data-noshow-text></label>
    </div>
    <button type="submit" disabled data-submit>Bestellung senden</button>
    <p class="bp-status" role="status" aria-live="polite" data-status></p>
  </form>
</section>
<script>
(function(){
  document.querySelectorAll('[data-order-endpoint]').forEach(function(section){
    var cart = {};
    var total = section.querySelector('[data-total]');
    var submit = section.querySelector('[data-submit]');
    var consentWrap = section.querySelector('[data-noshow-consent]');
    var consentText = section.querySelector('[data-noshow-text]');
    var status = section.querySelector('[data-status]');
    var noShowActive = false;

    function fmt(n){ return n.toFixed(2).replace('.', ',') + '\\u00a0€'; }
    function recalc(){
      var sum = 0;
      Object.keys(cart).forEach(function(k){ sum += cart[k].qty * cart[k].price; });
      total.textContent = fmt(sum);
      var hasItems = sum > 0 && Object.values(cart).some(function(c){ return c.qty > 0; });
      submit.disabled = !hasItems || (noShowActive && !consentCheckbox.checked);
    }

    section.querySelectorAll('[data-item]').forEach(function(row){
      var name = row.dataset.name, price = Number(row.dataset.price);
      cart[name] = { qty: 0, price: price };
      var qtyEl = row.querySelector('[data-qty]');
      row.querySelector('[data-increment]').addEventListener('click', function(){
        cart[name].qty += 1; qtyEl.textContent = cart[name].qty; recalc();
      });
      row.querySelector('[data-decrement]').addEventListener('click', function(){
        cart[name].qty = Math.max(0, cart[name].qty - 1); qtyEl.textContent = cart[name].qty; recalc();
      });
    });

    var consentCheckbox = consentWrap.querySelector('input');
    consentCheckbox.addEventListener('change', recalc);

    fetch(section.dataset.configEndpoint).then(function(r){ return r.ok ? r.json() : null; }).then(function(cfg){
      if (cfg && cfg.noShowSchutzAktiv) {
        noShowActive = true;
        consentText.textContent = cfg.noShowZustimmungstext || 'Ich stimme der Ausfallpauschale bei Nichtabholung zu.';
        consentWrap.hidden = false;
        consentCheckbox.required = true;
      }
      recalc();
    }).catch(function(){ recalc(); });

    var form = section.querySelector('[data-order-form]');
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var positionen = Object.keys(cart).filter(function(k){ return cart[k].qty > 0; }).map(function(k){
        return { name: k, menge: cart[k].qty, preis: cart[k].price };
      });
      var data = Object.fromEntries(new FormData(form).entries());
      data.positionen = positionen;
      data.noShowZustimmung = consentCheckbox.checked;
      submit.disabled = true;
      status.dataset.state = '';
      status.textContent = '';
      fetch(section.dataset.orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res){
        return res.json().then(function(body){ return { ok: res.ok, body: body }; });
      }).then(function(result){
        if (result.ok) {
          status.dataset.state = 'ok';
          status.textContent = 'Danke! Bestellnummer ' + (result.body.nummer || '') + '. Wir bestätigen die Abholzeit.';
          form.reset();
          Object.keys(cart).forEach(function(k){ cart[k].qty = 0; });
          section.querySelectorAll('[data-qty]').forEach(function(el){ el.textContent = '0'; });
          recalc();
        } else {
          status.dataset.state = 'error';
          status.textContent = result.body && result.body.error ? result.body.error : 'Die Bestellung konnte nicht gesendet werden.';
        }
      }).catch(function(){
        status.dataset.state = 'error';
        status.textContent = 'Keine Verbindung zum Server. Bitte versuchen Sie es später erneut.';
      }).finally(function(){ recalc(); });
    });

    recalc();
  });
})();
</script>`.trim() : '';
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
