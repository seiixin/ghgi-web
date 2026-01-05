export function humanizeLaravelError(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Request failed';

  const errors = data.errors || null;
  const msg = data.message || err?.message || 'Request failed';
  if (!errors) return msg;

  const flat = [];
  for (const [field, items] of Object.entries(errors)) {
    for (const it of (items || [])) flat.push({ field, message: String(it) });
  }

  const unique = flat.find((e) => /unique|already been taken/i.test(e.message));
  if (unique) {
    if (unique.field === 'name') return 'A form with the same title already exists. Please use a different title.';
    if (unique.field === 'key') return 'A form with the same key already exists. Please change the key.';
    return 'A duplicate record exists. Please change the conflicting value.';
  }

  const first = flat[0];
  if (!first) return msg;

  const prettyField = first.field
    .replace(/_/g, ' ')
    .replace(/\w/g, (c) => c.toUpperCase());

  return `${prettyField}: ${first.message}`;
}
