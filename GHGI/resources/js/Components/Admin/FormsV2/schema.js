export function slugifyKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

export function buildSchemaJson({ title, fields }) {
  return {
    title: title || 'Untitled',
    fields: (fields || []).map((f) => {
      const out = { key: f.key, label: f.label, type: f.type, required: !!f.required };
      if (f.type === 'select') out.options = (f.options || []).filter(Boolean);
      return out;
    }),
  };
}

export function buildUiJson({ municipalityLabel, barangayText }) {
  return { meta: { municipality: municipalityLabel || 'All LGUs', barangay: barangayText || '' } };
}

export function buildMappingJson(fields) {
  const out = {};
  for (const f of fields || []) out[f.key] = '';
  return out;
}
