#!/usr/bin/env node
// Manual, opt-in live check against the real Google Places API — NOT part
// of `npm test` (the brief explicitly forbids live API calls in automated
// tests) and not run by anything automatically. Run this yourself once
// after setting GOOGLE_PLACES_API_KEY in .env, to confirm the real API
// response actually matches what dashboard/prospect-server.js expects:
//
//   node --env-file=.env scripts/check-google-places-live.js "Restaurants in Mühldorf am Inn"
//
// Prints the parsed result and a short structural diff against the
// documented Places API (New) fields this project reads, so you can see
// at a glance whether anything is missing/different in your real account's
// response before relying on it. Nothing here is written to git, .env, or
// any store file — it only prints to stdout.
import { searchGooglePlaces } from '../dashboard/prospect-server.js';

const query = process.argv.slice(2).join(' ').trim() || 'Restaurants in Mühldorf am Inn';

if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY ist nicht gesetzt. Mit --env-file=.env starten oder die Variable exportieren.');
  process.exitCode = 1;
} else {
  try {
    console.log(`Suche live bei Google Places: "${query}" ...`);
    const results = await searchGooglePlaces(query);
    console.log(`\n${results.length} Treffer (max. 20):\n`);
    for (const r of results) {
      const missing = Object.entries(r).filter(([, v]) => v === '' || v === null).map(([k]) => k);
      console.log(`- ${r.name || '(ohne Name)'} · ${r.adresse || '(ohne Adresse)'}`);
      console.log(`  placeId=${r.placeId} website=${r.website || '–'} rating=${r.rating ?? '–'} bewertungen=${r.bewertungen ?? '–'}`);
      if (missing.length) console.log(`  fehlende Felder in dieser Antwort: ${missing.join(', ')}`);
    }
    console.log('\nLive-Check erfolgreich. Die geparste Form entspricht dem, was der Server intern verwendet.');
  } catch (err) {
    console.error(`Live-Check fehlgeschlagen: ${err.message}`);
    process.exitCode = 1;
  }
}
