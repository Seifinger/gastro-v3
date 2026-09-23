# Lead-Finder: Nutzung und Entscheidungen

In Google Cloud Places API (New) und Abrechnung aktivieren und den API-Key auf diese API beschränken. Lokal in `.env` `GOOGLE_PLACES_API_KEY=...` ergänzen; niemals nach GitHub hochladen.

## Terminal: `npm run leads`

```bash
npm run leads -- "Restaurants in Rosenheim" "Restaurants in Mühldorf am Inn"
```

Jede Region ist eine eigene Google-Places-Text-Search-Anfrage (max. 20 Treffer je Anfrage); Treffer aus mehreren Regionen werden über die Place-ID zusammengeführt und dedupliziert. Für jeden Treffer wird die Website heuristisch analysiert (Bestellfunktion, Reservierung, Mobil-Tauglichkeit, veralteter Copyright-Footer, HTTPS) und nach Dringlichkeit gescort (`scoreProspect` in `dashboard/prospect-server.js`, dieselbe Logik wie im Dashboard). Die Ergebnisliste wird absteigend nach Score in der Konsole ausgegeben. Für jeden Treffer wird zusätzlich ein statischer Konzept-Demo-Entwurf als HTML-Datei unter `data/runtime/previews/<placeId>.html` erzeugt (`renderDemoPreview`, keine übernommenen Fotos/Bewertungen). Alle Treffer werden zugleich in `data/runtime/prospects.json` gespeichert bzw. aktualisiert — dieselbe Datei, die auch das Dashboard unter `/prospects` liest, sodass beide Wege dieselbe Liste teilen.

## Dashboard: `/prospects`

Alternativ (oder ergänzend) im Dashboard: In PowerShell `npm run dev` ausführen; bei Portkollision `DASHBOARD_PORT=3100` in `.env` setzen. Im Dashboard unter `/einstellungen` den Dashboard-Token speichern, dann `/prospects` öffnen, dort per Klick suchen und importieren.

## Datenschutz/Kosten

Google Places wird nur nach Klick bzw. CLI-Aufruf per Text Search mit maximal 20 Treffern je Anfrage angefragt. Telefon, Website und Bewertung erhöhen möglicherweise die Kosten; Google-Cloud-Budgetwarnungen setzen. Dauerhaft unter `data/runtime/` gespeichert werden Place-ID, Name, Adresse, Telefon, Website, Bewertungszahl und die eigene Website-Analyse — kein Foto und kein Rezensionstext. Kein Google-Rohdatum, keine Rezension und kein Foto gelangt in ein Kunden-Briefing; unter `/neu` werden unabhängig geprüfte Daten manuell als Entwurf angelegt. API-Key und Place-Daten bleiben serverseitig bzw. lokal, Such- und Dashboard-Schreibendpunkte benötigen den bestehenden Dashboard-Bearer-Token (die CLI läuft lokal ohne HTTP und braucht ihn daher nicht). Live-Google-Anfragen wurden nicht ausgeführt; Tests nutzen Mock-Antworten.

`dashboard/lead-finder-server.js` (Route `/lead-finder`) ist ein älterer, nicht mehr verdrahteter Vorläufer (wird von `npm run dev` nicht gestartet) und wurde bewusst unverändert gelassen — siehe `DECISIONS.md`.
