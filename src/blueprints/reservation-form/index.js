import { escapeHtml, escapeAttr, scopeClass } from '../_shared/util.js';
import { css } from './style.js';
import { motion } from './motion.js';

export function render(briefing, tokens, ctx = {}) {
  const scope = scopeClass('reservation-form');
  const slug = briefing.id;
  const apiBase = (ctx.apiBase || '').replace(/\/$/, '');
  const endpoint = `${apiBase}/betrieb/${encodeURIComponent(slug)}/reservierung`;
  const html = `
<section class="${scope}" aria-label="Tisch reservieren" id="reservieren">
  <h2>Tisch reservieren</h2>
  <p class="bp-intro">Wir bestätigen Ihre Reservierung, sobald wir sie geprüft haben.</p>
  <form data-reservation-form data-endpoint="${escapeAttr(endpoint)}" novalidate>
    <div class="bp-field"><label for="${scope}-name">Name</label><input id="${scope}-name" name="name" type="text" autocomplete="name" required></div>
    <div class="bp-field"><label for="${scope}-personen">Personen</label><input id="${scope}-personen" name="personen" type="number" min="1" max="40" required></div>
    <div class="bp-field"><label for="${scope}-datum">Datum</label><input id="${scope}-datum" name="datum" type="date" required></div>
    <div class="bp-field"><label for="${scope}-uhrzeit">Uhrzeit</label><input id="${scope}-uhrzeit" name="uhrzeit" type="time" required></div>
    <div class="bp-field"><label for="${scope}-telefon">Telefon</label><input id="${scope}-telefon" name="telefon" type="tel" autocomplete="tel"></div>
    <div class="bp-field"><label for="${scope}-email">E-Mail</label><input id="${scope}-email" name="email" type="email" autocomplete="email"></div>
    <div class="bp-field bp-span2"><label for="${scope}-wunsch">Wunsch (optional)</label><textarea id="${scope}-wunsch" name="wunsch" rows="2"></textarea></div>
    <button type="submit">Reservierung anfragen</button>
    <p class="bp-status" role="status" aria-live="polite" data-status></p>
  </form>
</section>
<script>
(function(){
  document.querySelectorAll('[data-reservation-form]').forEach(function(form){
    var status = form.querySelector('[data-status]');
    var button = form.querySelector('button[type=submit]');
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var data = Object.fromEntries(new FormData(form).entries());
      data.personen = Number(data.personen);
      status.dataset.state = '';
      status.textContent = '';
      button.disabled = true;
      fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res){
        return res.json().then(function(body){ return { ok: res.ok, body: body }; });
      }).then(function(result){
        if (result.ok) {
          status.dataset.state = 'ok';
          status.textContent = 'Danke, Ihre Anfrage ist eingegangen. Wir melden uns zur Bestätigung.';
          form.reset();
        } else {
          status.dataset.state = 'error';
          status.textContent = result.body && result.body.error ? result.body.error : 'Die Reservierung konnte nicht gesendet werden.';
        }
      }).catch(function(){
        status.dataset.state = 'error';
        status.textContent = 'Keine Verbindung zum Server. Bitte versuchen Sie es später erneut oder rufen Sie uns an.';
      }).finally(function(){ button.disabled = false; });
    });
  });
})();
</script>`.trim();
  return { html, css: css(tokens, scope) + motion(tokens, scope) };
}

export { css } from './style.js';
export { motion } from './motion.js';
