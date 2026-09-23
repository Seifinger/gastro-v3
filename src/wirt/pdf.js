// No-show Vorgangsquittung: a protocol of what happened (order, consent
// text/timestamp, confirmed amount), not an invoice or a legal demand —
// see DECISIONS.md for why this distinction matters.
import PDFDocument from 'pdfkit';

export function buildNoShowReceipt(betriebName, bestellung) {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.fontSize(16).text('Vorgangsquittung – Nichtabholung', { underline: true });
  doc.moveDown();
  doc.fontSize(10).fillColor('#555').text('Dieses Dokument protokolliert einen Vorgang. Es ist keine Rechnung und keine eigenständige rechtliche Forderung.');
  doc.moveDown();
  doc.fillColor('#000').fontSize(12);
  doc.text(`Betrieb: ${betriebName}`);
  doc.text(`Bestellnummer: ${bestellung.nummer}`);
  doc.text(`Eingegangen: ${bestellung.eingegangen}`);
  doc.text(`Name: ${bestellung.name}`);
  if (bestellung.telefon) doc.text(`Telefon: ${bestellung.telefon}`);
  doc.text(`Zugesagte Abholzeit: ${bestellung.bestaetigteAbholzeit || bestellung.abholzeit}`);
  doc.moveDown();
  doc.text('Bestellte Positionen:');
  for (const p of bestellung.positionen) {
    doc.text(`  ${p.menge} × ${p.name} – ${(p.preis * p.menge).toFixed(2).replace('.', ',')} €`);
  }
  doc.text(`Gesamt: ${bestellung.gesamt.toFixed(2).replace('.', ',')} €`);
  doc.moveDown();
  doc.text('Zustimmung zur Ausfallpauschale:');
  doc.fontSize(10).text(bestellung.noShowZustimmung?.text ?? '(keine erfasst)');
  doc.text(`Zeitpunkt der Zustimmung: ${bestellung.noShowZustimmung?.zeitpunkt ?? '–'}`);
  doc.moveDown();
  doc.fontSize(12).text(`Bestätigt als "nicht erschienen" am: ${bestellung.noShowBestaetigtAm}`);
  doc.text(`Ausfallbetrag (bestätigt): ${Number(bestellung.noShowBetrag ?? 0).toFixed(2).replace('.', ',')} €`);

  doc.end();
  return done;
}
