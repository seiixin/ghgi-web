// resources/js/Pages/Admin/Quantification/Submissions/ResponsesMatrixOnly.jsx
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../../../../Components/Shared/DataTable";

function formatDate(v) {
  try {
    if (!v) return "";
    return new Date(v).toLocaleString();
  } catch {
    return v ?? "";
  }
}

function safeStr(x) {
  return String(x ?? "").trim();
}

function toLabel(fieldKey) {
  return String(fieldKey || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

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

/**
 * Quantification view = Responses Matrix only
 * - Columns include Submission meta + Location columns + Dynamic schema fields
 * - Rows = submissions (filtered) on the page
 */
export default function ResponsesMatrixOnly({ refreshKey = 0, initialYear = "" }) {
  // left: forms
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);
  const [formSearch, setFormSearch] = useState("");
  const [activeForm, setActiveForm] = useState(null);

  // schema fields for dynamic columns
  const [schemaFields, setSchemaFields] = useState([]);

  // filters
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [year, setYear] = useState(initialYear ? String(initialYear) : "");

  // location filters (optional; will work if backend supports)
  const [provFilter, setProvFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [brgyFilter, setBrgyFilter] = useState("");

  // submissions rows (meta only)
  const [submissionRows, setSubmissionRows] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subsError, setSubsError] = useState(null);

  // answers map per submission id
  const [answersById, setAnswersById] = useState({});
  const [loadingAns, setLoadingAns] = useState(false);
  const [ansError, setAnsError] = useState(null);

  // keep in sync with Quantification/Index year input
  useEffect(() => {
    setYear(initialYear ? String(initialYear) : "");
  }, [initialYear]);

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
    loadForms();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line
  }, [refreshKey]);

  // derive schema fields for active form (dynamic columns)
  useEffect(() => {
    if (!activeForm) {
      setSchemaFields([]);
      return;
    }
    const { fields } = schemaFieldsFromFormRow(activeForm);
    setSchemaFields(
      (Array.isArray(fields) ? fields : [])
        .filter((f) => !!f?.key)
        .map((f) => ({
          key: f.key,
          label: f.label ?? toLabel(f.key),
          type: f.type ?? "text",
        }))
    );
  }, [activeForm]);

  async function loadSubmissions() {
    if (!activeForm?.id) {
      setSubmissionRows([]);
      return;
    }

    setLoadingSubs(true);
    setSubsError(null);

    try {
      const params = new URLSearchParams();
      params.set("form_type_id", String(activeForm.id));
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (year) params.set("year", String(year));

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
      setSubmissionRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setSubmissionRows([]);
      setSubsError(e?.message || "Failed to load submissions");
    } finally {
      setLoadingSubs(false);
    }
  }

  // load submissions when filters change
  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line
  }, [activeForm?.id, status, source, year, provFilter, cityFilter, brgyFilter, refreshKey]);

  // load answers for the current page of submissions (build answers map)
  useEffect(() => {
    const ids = (Array.isArray(submissionRows) ? submissionRows : []).map((r) => r?.id).filter(Boolean);
    if (!ids.length) {
      setAnswersById({});
      return;
    }

    let cancelled = false;

    async function loadAnswers() {
      setLoadingAns(true);
      setAnsError(null);

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
        setAnsError(e?.message || "Failed to load answers");
        setAnswersById({});
      } finally {
        if (!cancelled) setLoadingAns(false);
      }
    }

    loadAnswers();
    return () => {
      cancelled = true;
    };
  }, [submissionRows]);

  const matrixColumns = useMemo(() => {
    const base = [
      { key: "id", label: "ID" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "year", label: "Year" },
      { key: "submitted_at", label: "Submitted" },

      // LOCATION (added columns)
      { key: "prov_name", label: "Province" },
      { key: "city_name", label: "City/Municipality" },
      { key: "brgy_name", label: "Barangay" },
    ];

    const dynamic = (Array.isArray(schemaFields) ? schemaFields : []).map((f) => ({
      key: f.key,
      label: f.label ?? toLabel(f.key),
    }));

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
        year: r?.year ?? "",
        submitted_at: formatDate(r?.submitted_at) || "",

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

  return (
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
              <div className="text-sm text-gray-600">Responses Matrix</div>
            </div>

            {/* Filters */}
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
                disabled={loadingSubs || !activeForm?.id}
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="p-4">
            {subsError ? <div className="mb-2 text-sm text-red-600">{subsError}</div> : null}
            {ansError ? <div className="mb-2 text-sm text-red-600">{ansError}</div> : null}

            {!activeForm?.id ? (
              <div className="text-sm text-gray-600">Select a form to view responses matrix.</div>
            ) : loadingSubs || loadingAns ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : (
              <div className="overflow-auto">
                <div className="min-w-[1180px]">
                  <DataTable columns={matrixColumns} rows={matrixRows} />
                </div>
              </div>
            )}

            {!loadingSubs && !loadingAns && activeForm?.id ? (
              <div className="mt-2 text-xs text-gray-500">Rows: {matrixRows?.length ?? 0}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
