import React, { useEffect, useMemo, useState } from "react";

/**
 * FormPicker
 * Fetches available forms for a given year.
 *
 * Expects endpoint:
 *  - GET /api/admin/forms?year=YYYY
 *
 * Accepts flexible payload shapes:
 *  - { data: { formTypes: [...] } }
 *  - { formTypes: [...] }
 *  - { data: [...] }
 *  - [ ... ]
 *
 * Each item should look like:
 *  - { id, name?, code? }
 */
export default function FormPicker({ year, value, onChange }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const selectedId = value?.id ?? "";

  const options = useMemo(() => {
    return (Array.isArray(forms) ? forms : []).map((f) => ({
      id: f.id,
      label: f.name ?? f.code ?? `Form #${f.id}`,
      raw: f,
    }));
  }, [forms]);

  function normalizeList(payload) {
    const list =
      payload?.data?.formTypes ??
      payload?.formTypes ??
      payload?.data ??
      payload;

    return Array.isArray(list) ? list : [];
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));

      const res = await fetch(`/api/admin/forms?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

      setForms(normalizeList(payload));
    } catch (e) {
      setErr(e?.message || "Failed to load forms");
      setForms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return (
    <div>
      <label className="block text-xs text-gray-600">Form</label>

      {err && <div className="text-xs text-red-600 mb-1">{err}</div>}

      <div className="flex gap-2">
        <select
          className="border rounded px-2 py-2 text-sm w-full"
          value={selectedId}
          onChange={(e) => {
            const id = Number(e.target.value);
            const opt = options.find((o) => o.id === id);
            if (typeof onChange === "function") onChange(opt?.raw ?? null);
          }}
          disabled={loading}
        >
          <option value="">Select a form...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? "..." : "Reload"}
        </button>
      </div>
    </div>
  );
}
