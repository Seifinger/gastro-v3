// Builds LocalBusiness JSON-LD strictly from confirmed briefing fields.
// Anything not confirmed is simply omitted rather than guessed.
export function buildLocalBusinessJsonLd(briefing, canonicalUrl) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: briefing.name,
    servesCuisine: briefing.kueche,
    address: {
      '@type': 'PostalAddress',
      addressLocality: briefing.ort,
    },
  };
  if (canonicalUrl) data.url = canonicalUrl;
  if (briefing.adresse?.status === 'confirmed' && briefing.adresse.value) {
    data.address.streetAddress = briefing.adresse.value;
  }
  if (briefing.telefon?.status === 'confirmed' && briefing.telefon.value) {
    data.telephone = briefing.telefon.value;
  }
  if (briefing.preisklasse?.status === 'confirmed' && briefing.preisklasse.value) {
    const map = { 'günstig': '€', mittel: '€€', gehoben: '€€€', 'fine-dining': '€€€€' };
    data.priceRange = map[briefing.preisklasse.value] || briefing.preisklasse.value;
  }
  if (briefing.oeffnungszeiten?.status === 'confirmed' && briefing.oeffnungszeiten.value) {
    const dayMap = { montag: 'Mo', dienstag: 'Tu', mittwoch: 'We', donnerstag: 'Th', freitag: 'Fr', samstag: 'Sa', sonntag: 'Su' };
    const specs = [];
    for (const [day, hours] of Object.entries(briefing.oeffnungszeiten.value)) {
      const match = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(String(hours).trim());
      const dow = dayMap[day.toLowerCase()];
      if (match && dow) {
        specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${{
          Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
        }[dow]}`, opens: match[1], closes: match[2] });
      }
    }
    if (specs.length) data.openingHoursSpecification = specs;
  }
  if (briefing.fotos?.status === 'confirmed' && Array.isArray(briefing.fotos.value)) {
    const urls = briefing.fotos.value.filter((p) => p.confirmed).map((p) => p.url);
    if (urls.length) data.image = urls;
  }
  return data;
}
