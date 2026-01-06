// resources/js/Pages/Admin/Submissions/Partials/FormPicker.jsx
// IMPORTANT: adjust your existing FormPicker to NOT require year.
// If you already have it, replace with this full file.

import React, { useEffect, useMemo, useState } from "react";

function normalizeFormsList(payload) {
  const list =
    (Array.isArray(payload) ? payload : null) ??
    payload?.data?.formTypes ??
    payload?.formTypes ??
    payload?.data ??
    [];
  return Array.isArray(list) ? list : [];
}

function asFormLabel(f) {
  return f?.name ?? f?.key ?? `Form #${f?.id ?? ""}`;
}

function pickActiveSchema(schemaVersions = []) {
  const active = (schemaVersions || []).find((v) => v.status === "active");
  return active || (schemaVersions || [])[0] || null;
}

function deriveSchemaYear(activeSchema) {
  if (!activeSchema) return null;
  const y =
    activeSchema?.year ??
    activeSchema?.effective_year ??
    activeSchema?.schema_year ??
    activeSchema?.schemaYear ??
    null;
  const n = Number(y);
  if (!Number.isFinite(n) || n <= 1900) return null;
  return n;
}

function formatFormOptionLabel(formRow) {
  const versions = formRow?.schema_versions || formRow?.schemaVersions || [];
  const active = pickActiveSchema(versions);
  const y = deriveSchemaYear(active);

  // desired: "Form Name (2023)"
  return `${asFormLabel(formRow)}${y ? ` (${y})` : ""}`;
}

export default function FormPicker({ value, onChange, placeholder = "Select a form…" }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const selectedId = value?.id ? String(value.id) : "";

  const options = useMemo(() => {
    const list = Array.isArray(forms) ? forms : [];
    return list
      .slice()
      .sort((a, b) => formatFormOptionLabel(a).localeCompare(formatFormOptionLabel(b)));
  }, [forms]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/forms?active=all`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await res.json() : { message: await res.text() };
      if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

      setForms(normalizeFormsList(payload));
    } catch (e) {
      setForms([]);
      setErr(e?.message || "Failed to load forms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      {err ? <div className="text-xs text-red-600 mb-1">{err}</div> : null}

      <select
        className="border rounded px-3 py-2 text-sm w-full disabled:opacity-60"
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value;
          const row = options.find((x) => String(x.id) === String(id)) || null;
          onChange?.(row);
        }}
        disabled={loading}
      >
        <option value="">{loading ? "Loading…" : placeholder}</option>
        {options.map((f) => (
          <option key={f.id} value={String(f.id)}>
            {formatFormOptionLabel(f)}
          </option>
        ))}
      </select>
    </div>
  );
}
