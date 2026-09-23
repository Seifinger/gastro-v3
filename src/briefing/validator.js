import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './schema.json' with { type: 'json' };

export const optionalFields = Object.keys(schema.properties).filter(key => !schema.required.includes(key));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

export function validateBriefing(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, briefing: null, errors: [{ path: '/', message: 'Briefing muss ein Objekt sein' }] };
  }
  const briefing = structuredClone(input);
  for (const key of optionalFields) {
    if (briefing[key] === undefined) briefing[key] = { value: null, status: 'draft' };
  }
  const valid = validateSchema(briefing);
  const errors = (validateSchema.errors || []).map(error => ({ path: error.instancePath || '/', message: error.message, keyword: error.keyword }));
  for (const key of optionalFields) {
    const field = briefing[key];
    if (field && typeof field === 'object' && field.status === 'confirmed' && (field.value === null || field.value === '' || (Array.isArray(field.value) && !field.value.length))) {
      errors.push({ path: `/${key}`, message: 'Leerer Wert darf nicht bestätigt werden', keyword: 'provenance' });
    }
  }
  if (briefing.fotos?.status === 'confirmed' && briefing.fotos.value?.some(photo => !photo.confirmed)) {
    errors.push({ path: '/fotos', message: 'Nicht bestätigte Fotos dürfen kein bestätigtes Fotofeld ergeben', keyword: 'provenance' });
  }
  return { valid: Boolean(valid) && !errors.length, briefing, errors };
}
