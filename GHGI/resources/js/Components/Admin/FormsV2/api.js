function hasAxios() {
  return typeof window !== 'undefined' && !!window.axios;
}

async function fetchJson(url, { method = 'GET', data, headers = {} } = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (data !== undefined) opts.body = JSON.stringify(data);

  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { message: text }; }
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  return json;
}

export async function apiGet(url) {
  if (hasAxios()) return (await window.axios.get(url)).data;
  return fetchJson(url);
}

export async function apiPost(url, data) {
  if (hasAxios()) return (await window.axios.post(url, data)).data;
  return fetchJson(url, { method: 'POST', data });
}

export async function apiPatch(url, data) {
  if (hasAxios()) return (await window.axios.patch(url, data)).data;
  return fetchJson(url, { method: 'PATCH', data });
}

export async function apiDelete(url) {
  if (hasAxios()) return (await window.axios.delete(url)).data;
  return fetchJson(url, { method: 'DELETE' });
}
