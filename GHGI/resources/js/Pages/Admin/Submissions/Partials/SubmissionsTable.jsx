// resources/js/Pages/Admin/Quantification/Submissions/SubmissionsTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../../../../Components/Shared/DataTable";
import AnswersViewer from "./AnswersViewer";
import EditSubmissionModal from "./EditSubmissionModal";

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

function apiHeaders({ json = true } = {}) {
  const headers = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-TOKEN"] = csrf;

  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function readPayload(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text();
  return { message: text };
}

function formatDate(v) {
  try {
    if (!v) return "";
    return new Date(v).toLocaleString();
  } catch {
    return v ?? "";
  }
}

function normalizeFormsList(payload) {
  const list =
    (Array.isArray(payload) ? payload : null) ??
    payload?.data?.formTypes ??
    payload?.formTypes ??
    payload?.data ??
    [];
  return Array.isArray(list) ? list : [];
}

function extractRows(payload) {
  const candidates = [payload?.data?.rows, payload?.rows, payload?.data, payload];
  for (const c of candidates) {
    if (!c) continue;
    if (Array.isArray(c)) return c;
    if (typeof c === "object" && Array.isArray(c.data)) return c.data; // paginator
    if (typeof c === "object" && c.rows && Array.isArray(c.rows.data)) return c.rows.data;
  }
  return [];
}

function asFormLabel(f) {
  return f?.name ?? f?.key ?? `Form #${f?.id ?? ""}`;
}

function pickActiveSchema(schemaVersions = []) {
  const active = (schemaVersions || []).find((v) => v.status === "active");
  return active || (schemaVersions || [])[0] || null;
}

function schemaFieldsFromFormRow(row) {
  const versions = row?.schema_versions || row?.schemaVersions || [];
  const activeSchema = pickActiveSchema(versions);
  const schemaJson = activeSchema?.schema_json || activeSchema?.schemaJson || {};
  const fields = Array.isArray(schemaJson.fields) ? schemaJson.fields : [];
  return { fields, activeSchema };
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

function formatFormLabelWithYear(formRow) {
  const versions = formRow?.schema_versions || formRow?.schemaVersions || [];
  const active = pickActiveSchema(versions);
  const y = deriveSchemaYear(active);
  return `${asFormLabel(formRow)}${y ? ` (${y})` : ""}`;
}

function toLabel(fieldKey) {
  return String(fieldKey || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function pickValueFromAnswerRow(a) {
  if (a?.option_label) return a.option_label;
  if (a?.optionLabel) return a.optionLabel;
  if (a?.option_key && !a?.option_label) return a.option_key;

  if (a?.value_text !== null && a?.value_text !== undefined && String(a.value_text).trim() !== "") return a.value_text;
  if (a?.value_number !== null && a?.value_number !== undefined) return a.value_number;
  if (a?.value_bool !== null && a?.value_bool !== undefined) return a.value_bool ? "Yes" : "No";
  if (a?.value_json !== null && a?.value_json !== undefined) return a.value_json;
  if (a?.value !== null && a?.value !== undefined) return a.value;

  return "";
}

function prettifyAny(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      try {
        return new Date(value + "T00:00:00").toLocaleDateString();
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (!value.length) return "";
    return value.map((x) => prettifyAny(x)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "";
    return entries.map(([k, v]) => `${toLabel(k)}: ${prettifyAny(v)}`).join("\n");
  }

  return String(value);
}

function formatLocationInline(r) {
  const prov = (r?.prov_name ?? "").trim();
  const city = (r?.city_name ?? "").trim();
  const brgy = (r?.brgy_name ?? "").trim();
  const parts = [prov, city, brgy].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

function safeStr(x) {
  return String(x ?? "").trim();
}

// ------------------ Simple SVG Pie ------------------
function hslColor(i, total) {
  const hue = Math.round((i * 360) / Math.max(1, total));
  return `hsl(${hue} 70% 55%)`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function PieChart({ data = [], size = 120 }) {
  const total = data.reduce((acc, d) => acc + (Number(d.value) || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  if (!total) return <div className="text-xs text-gray-500">No data</div>;

  let angle = 0;
  const slices = data.map((d, idx) => {
    const val = Number(d.value) || 0;
    const sliceAngle = (val / total) * 360;
    const start = angle;
    const end = angle + sliceAngle;
    angle = end;

    return { ...d, path: arcPath(cx, cy, r, start, end), color: hslColor(idx, data.length) };
  });

  return (
    <div className="flex items-start gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} />
        ))}
      </svg>
      <div className="text-xs text-gray-700 space-y-1 min-w-[160px]">
        {slices.map((s, i) => {
          const pct = total ? Math.round((Number(s.value) / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
                <span className="truncate" title={String(s.label)}>
                  {String(s.label)}
                </span>
              </div>
              <div className="tabular-nums text-gray-600">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------ Summary Tab ------------------
function buildDistribution(values, limit = 8) {
  const counts = new Map();
  for (const v of values) {
    const key = String(v ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  if (sorted.length <= limit) return sorted;

  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  const others = tail.reduce((acc, x) => acc + x.value, 0);
  head.push({ label: "Others", value: others });
  return head;
}

function Tabs({ active, onChange }) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center gap-6 px-4">
        {[
          { key: "summary", label: "Summary" },
          { key: "submissions", label: "Submissions" },
        ].map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={[
                "py-3 text-sm font-semibold",
                isActive ? "text-indigo-700 border-b-2 border-indigo-700" : "text-gray-600 hover:text-gray-900",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * UPDATED:
 * - Summary matrix adds columns for reg_name/prov_name/city_name/brgy_name
 * - Pie charts include:
 *   - existing select/radio/checkbox/boolean fields from schema answers
 *   - PLUS location pies for Province / City / Barangay (from submission table columns)
 */
function SummaryTab({ activeForm, schemaFields, status, source, year, submissionRows }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [answersById, setAnswersById] = useState({});

  useEffect(() => {
    if (!activeForm?.id) return;

    const ids = (Array.isArray(submissionRows) ? submissionRows : []).map((r) => r?.id).filter(Boolean);
    if (!ids.length) {
      setAnswersById({});
      return;
    }

    let cancelled = false;

    async function loadAnswers() {
      setLoading(true);
      setErr(null);

      try {
        const max = 6;
        const queue = [...ids];
        const results = {};

        async function worker() {
          while (queue.length) {
            const id = queue.shift();
            if (!id) continue;

            const res = await fetch(`/api/admin/submissions/${id}`, {
              headers: { Accept: "application/json" },
              credentials: "same-origin",
            });

            const payload = await readPayload(res);
            if (!res.ok) throw new Error(payload?.message || `Failed to load submission #${id}`);

            const rawAns =
              payload?.data?.answers ??
              payload?.answers ??
              payload?.data?.submission?.answers ??
              payload?.data?.submission?.answers_map ??
              payload?.data?.answers_map ??
              null;

            let ansMap = {};
            if (Array.isArray(rawAns)) {
              for (const a of rawAns) {
                const k = a.field_key ?? a.fieldKey ?? a.key ?? "";
                if (!k) continue;
                const v = pickValueFromAnswerRow(a);
                if (ansMap[k] === undefined) ansMap[k] = v;
                else {
                  const prev = ansMap[k];
                  ansMap[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
                }
              }
            } else if (rawAns && typeof rawAns === "object") {
              ansMap = rawAns;
            }

            results[id] = ansMap;
          }
        }

        await Promise.all(Array.from({ length: Math.min(max, ids.length) }, () => worker()));
        if (cancelled) return;
        setAnswersById(results);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to build summary");
        setAnswersById({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnswers();
    return () => {
      cancelled = true;
    };
  }, [activeForm?.id, submissionRows]);

  const matrixColumns = useMemo(() => {
    const base = [
      { key: "id", label: "ID" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "submitted_at", label: "Submitted" },

      // ADDED: location columns from submissions table
      { key: "reg_name", label: "Region" },
      { key: "prov_name", label: "Province" },
      { key: "city_name", label: "City/Municipality" },
      { key: "brgy_name", label: "Barangay" },
    ];

    const dynamic = (Array.isArray(schemaFields) ? schemaFields : [])
      .filter((f) => !!f?.key)
      .map((f) => ({ key: f.key, label: f.label ?? toLabel(f.key) }));

    return [...base, ...dynamic];
  }, [schemaFields]);

  const matrixRows = useMemo(() => {
    const list = Array.isArray(submissionRows) ? submissionRows : [];
    return list.map((r) => {
      const id = r?.id;
      const ans = id ? answersById[id] : {};
      const row = {
        id,
        status: r?.status ?? "",
        source: r?.source ?? "",
        submitted_at: formatDate(r?.submitted_at) || "",

        // ADDED: location cells
        reg_name: safeStr(r?.reg_name),
        prov_name: safeStr(r?.prov_name),
        city_name: safeStr(r?.city_name),
        brgy_name: safeStr(r?.brgy_name),
      };

      for (const f of Array.isArray(schemaFields) ? schemaFields : []) {
        if (!f?.key) continue;
        row[f.key] = prettifyAny(ans?.[f.key]) || "";
      }
      return row;
    });
  }, [submissionRows, answersById, schemaFields]);

  const pies = useMemo(() => {
    const piesOut = [];
    const list = Array.isArray(submissionRows) ? submissionRows : [];
    if (!list.length) return piesOut;

    // A) LOCATION pies (from submission table columns)
    const provVals = list.map((r) => safeStr(r?.prov_name)).filter(Boolean);
    const cityVals = list.map((r) => safeStr(r?.city_name)).filter(Boolean);
    const brgyVals = list.map((r) => safeStr(r?.brgy_name)).filter(Boolean);

    if (provVals.length) piesOut.push({ fieldKey: "__prov_name", label: "Province", data: buildDistribution(provVals, 8) });
    if (cityVals.length) piesOut.push({ fieldKey: "__city_name", label: "City/Municipality", data: buildDistribution(cityVals, 8) });
    if (brgyVals.length) piesOut.push({ fieldKey: "__brgy_name", label: "Barangay", data: buildDistribution(brgyVals, 8) });

    // B) ANSWER pies (select/radio/checkbox/boolean fields from schema)
    for (const f of Array.isArray(schemaFields) ? schemaFields : []) {
      if (!f?.key) continue;
      const type = String(f.type || "").toLowerCase();
      const isChoice = ["select", "radio", "checkbox", "boolean", "bool"].includes(type);
      if (!isChoice) continue;

      const values = [];
      for (const r of list) {
        const id = r?.id;
        const ans = id ? answersById[id] : null;
        const v = ans?.[f.key];

        if (Array.isArray(v)) values.push(...v.map((x) => String(x)));
        else if (v !== null && v !== undefined && String(v).trim() !== "") values.push(String(v));
      }

      piesOut.push({
        fieldKey: f.key,
        label: f.label ?? toLabel(f.key),
        data: buildDistribution(values, 8),
      });
    }

    return piesOut;
  }, [schemaFields, submissionRows, answersById]);

  return (
    <div className="p-4 space-y-4">
      {!activeForm?.id ? (
        <div className="text-sm text-gray-600">Select a form to view summary.</div>
      ) : (
        <>
          <div className="text-sm text-gray-700">
            Summary for <span className="font-semibold">{asFormLabel(activeForm)}</span>
            {year ? <span className="text-gray-500"> • Year: {year}</span> : null}
            {status ? <span className="text-gray-500"> • Status: {status}</span> : null}
            {source ? <span className="text-gray-500"> • Source: {source}</span> : null}
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          {loading ? (
            <div className="text-sm text-gray-600">Building summary…</div>
          ) : (
            <>
              {pies.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pies.map((p) => (
                    <div key={p.fieldKey} className="border rounded-lg p-3 bg-white">
                      <div className="text-sm font-semibold text-gray-900">{p.label}</div>
                      <div className="text-xs text-gray-500 mb-2">{p.fieldKey.startsWith("__") ? "Location" : p.fieldKey}</div>
                      <PieChart data={p.data} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-3 bg-gray-50 text-sm text-gray-600">
                  No pie charts available for this form on this page.
                </div>
              )}

              <div className="border rounded-lg bg-white">
                <div className="p-3 border-b">
                  <div className="text-sm font-semibold text-gray-900">Responses Matrix</div>
                  <div className="text-xs text-gray-500">Rows = submissions on this page • Columns = fields</div>
                </div>
                <div className="p-3 overflow-auto">
                  <div className="min-w-[1180px]">
                    <DataTable columns={matrixColumns} rows={matrixRows} />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function FormList({ forms, activeId, onSelect, search, setSearch, loading, error, onReload }) {
  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const list = Array.isArray(forms) ? forms : [];
    if (!q) return list;
    return list.filter((f) => {
      const blob = `${f.id} ${f.name ?? ""} ${f.key ?? ""} ${f.sector_key ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [forms, search]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-gray-900">Forms</div>
          <div className="text-sm text-gray-600">Select a form.</div>
        </div>
        <button
          type="button"
          className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
          onClick={onReload}
          disabled={loading}
        >
          Reload
        </button>
      </div>

      <div className="p-4 space-y-3">
        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <input
          className="border rounded px-3 py-2 text-sm w-full"
          placeholder="Search forms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : (
          <div className="max-h-[560px] overflow-auto border rounded">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-600">No forms found.</div>
            ) : (
              filtered.map((f) => {
                const isActive = String(activeId) === String(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={[
                      "w-full text-left px-3 py-3 border-b last:border-b-0",
                      isActive ? "bg-indigo-50" : "hover:bg-gray-50",
                    ].join(" ")}
                    onClick={() => onSelect(f)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900">{formatFormLabelWithYear(f)}</div>
                      <div className="text-xs text-gray-500">#{f.id}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {f?.sector_key ? `${f.sector_key} • ` : ""}
                      {f?.is_active ? "Active" : "Inactive"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubmissionsTable({ refreshKey = 0 }) {
  const [activeTab, setActiveTab] = useState("summary");

  // Left: forms
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);
  const [formSearch, setFormSearch] = useState("");
  const [activeForm, setActiveForm] = useState(null);

  // Schema fields for summary
  const [schemaFields, setSchemaFields] = useState([]);

  // Right: submissions for selected form
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [year, setYear] = useState(""); // optional filter

  // OPTIONAL: location filters (client-side query params if backend supports)
  const [provFilter, setProvFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [brgyFilter, setBrgyFilter] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState(null);

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },

      // ADDED: location columns in submissions table view
      { key: "prov_name", label: "Province" },
      { key: "city_name", label: "City/Mun" },
      { key: "brgy_name", label: "Barangay" },

      { key: "year", label: "Year" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
      { key: "submitted_at", label: "Submitted" },
      { key: "__actions", label: "Actions" },
    ],
    []
  );

  const submissionIds = useMemo(() => (Array.isArray(rows) ? rows.map((r) => r?.id).filter(Boolean) : []), [rows]);

  async function loadForms() {
    setFormsLoading(true);
    setFormsError(null);

    try {
      const res = await fetch(`/api/admin/forms?active=all`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

      const list = normalizeFormsList(payload);
      list.sort((a, b) => formatFormLabelWithYear(a).localeCompare(formatFormLabelWithYear(b)));

      setForms(list);

      if (!activeForm && list.length) setActiveForm(list[0]);
      else if (activeForm) {
        const still = list.find((x) => String(x.id) === String(activeForm.id));
        if (still) setActiveForm(still);
      }
    } catch (e) {
      setForms([]);
      setFormsError(e?.message || "Failed to load forms");
    } finally {
      setFormsLoading(false);
    }
  }

  useEffect(() => {
    if (!activeForm) {
      setSchemaFields([]);
      return;
    }
    const { fields } = schemaFieldsFromFormRow(activeForm);
    setSchemaFields(
      (Array.isArray(fields) ? fields : []).map((f) => ({
        key: f.key,
        label: f.label ?? toLabel(f.key),
        type: f.type ?? "text",
        options: Array.isArray(f.options) ? f.options : [],
      }))
    );
  }, [activeForm]);

  async function loadSubmissions() {
    if (!activeForm?.id) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("form_type_id", String(activeForm.id));
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (year) params.set("year", String(year));

      // If your backend later supports these, it will work automatically.
      if (provFilter) params.set("prov_name", provFilter);
      if (cityFilter) params.set("city_name", cityFilter);
      if (brgyFilter) params.set("brgy_name", brgyFilter);

      params.set("per_page", "50");

      const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

      const list = extractRows(payload);

      const normalized = (Array.isArray(list) ? list : []).map((r) => ({
        ...r,
        // keep location columns raw (strings)
        prov_name: safeStr(r?.prov_name),
        city_name: safeStr(r?.city_name),
        brgy_name: safeStr(r?.brgy_name),

        created_at: formatDate(r.created_at),
        submitted_at: formatDate(r.submitted_at),
        __actions: (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-indigo-600 hover:underline text-sm"
              onClick={() => {
                setActiveSubmissionId(r.id);
                setViewerOpen(true);
              }}
            >
              View
            </button>

            <button
              type="button"
              className="text-amber-700 hover:underline text-sm"
              onClick={() => {
                setEditId(r.id);
                setEditOpen(true);
              }}
            >
              Edit
            </button>

            <button
              type="button"
              className="text-red-700 hover:underline text-sm"
              onClick={() => {
                setDeleteErr(null);
                setDeleteId(r.id);
                setDeleteOpen(true);
              }}
            >
              Delete
            </button>
          </div>
        ),
      }));

      setRows(normalized);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteBusy(true);
    setDeleteErr(null);

    try {
      const res = await fetch(`/api/admin/submissions/${deleteId}`, {
        method: "DELETE",
        headers: apiHeaders({ json: false }),
        credentials: "same-origin",
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to delete submission (${res.status})`);

      setDeleteOpen(false);
      setDeleteId(null);

      await loadSubmissions();
    } catch (e) {
      setDeleteErr(e?.message || "Failed to delete");
    } finally {
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    loadForms();
    // eslint-disable-next-line
  }, [refreshKey]);
  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line
  }, [activeForm?.id, status, source, year, provFilter, cityFilter, brgyFilter, refreshKey]);

  return (
    <>
      <AnswersViewer
        open={viewerOpen}
        startId={activeSubmissionId}
        submissionIds={submissionIds}
        onClose={() => {
          setViewerOpen(false);
          setActiveSubmissionId(null);
        }}
      />

      <EditSubmissionModal
        open={editOpen}
        submissionId={editId}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        onSavedOrSubmitted={() => {
          loadSubmissions();
        }}
      />

      {/* DELETE MODAL */}
      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => (deleteBusy ? null : setDeleteOpen(false))} />
          <div className="relative w-full max-w-md rounded-lg bg-white shadow-lg border">
            <div className="p-4 border-b">
              <div className="text-base font-semibold text-gray-900">Delete submission?</div>
              <div className="text-sm text-gray-600">This will permanently delete Submission #{deleteId}.</div>
            </div>

            <div className="p-4 space-y-3">
              {deleteErr ? <div className="text-sm text-red-600">{deleteErr}</div> : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                  disabled={deleteBusy}
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="bg-red-600 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
                  disabled={deleteBusy}
                  onClick={confirmDelete}
                >
                  {deleteBusy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <FormList
            forms={forms}
            activeId={activeForm?.id}
            onSelect={(f) => setActiveForm(f)}
            search={formSearch}
            setSearch={setFormSearch}
            loading={formsLoading}
            error={formsError}
            onReload={loadForms}
          />
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">
                  {activeForm?.id ? <span>{formatFormLabelWithYear(activeForm)}</span> : "Select a form"}
                </div>
                <div className="text-sm text-gray-600">{activeTab === "summary" ? "Summary of responses" : "Submissions list"}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div>
                  <label className="block text-xs text-gray-600">Year (optional)</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm w-28"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="All"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Status</label>
                  <select className="border rounded px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Source</label>
                  <select className="border rounded px-2 py-1 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="">All</option>
                    <option value="admin">Admin</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>

                {/* OPTIONAL: location filters (works if backend supports; harmless otherwise) */}
                <div>
                  <label className="block text-xs text-gray-600">Province</label>
                  <input
                    className="border rounded px-2 py-1 text-sm w-36"
                    value={provFilter}
                    onChange={(e) => setProvFilter(e.target.value)}
                    placeholder="All"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">City/Mun</label>
                  <input
                    className="border rounded px-2 py-1 text-sm w-36"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="All"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600">Barangay</label>
                  <input
                    className="border rounded px-2 py-1 text-sm w-36"
                    value={brgyFilter}
                    onChange={(e) => setBrgyFilter(e.target.value)}
                    placeholder="All"
                  />
                </div>

                <button
                  type="button"
                  className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={loadSubmissions}
                  disabled={loading || !activeForm?.id}
                >
                  Refresh
                </button>
              </div>
            </div>

            <Tabs active={activeTab} onChange={setActiveTab} />

            {activeTab === "summary" ? (
              <SummaryTab activeForm={activeForm} schemaFields={schemaFields} status={status} source={source} year={year} submissionRows={rows} />
            ) : (
              <div className="p-4">
                {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}

                {!activeForm?.id ? (
                  <div className="text-sm text-gray-600">Select a form to view submissions.</div>
                ) : loading ? (
                  <div className="text-sm text-gray-600">Loading…</div>
                ) : (
                  <DataTable columns={columns} rows={rows ?? []} />
                )}

                {!loading && !error && activeForm?.id ? (
                  <div className="mt-2 text-xs text-gray-500">Rows: {rows?.length ?? 0}</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
