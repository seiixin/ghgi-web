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

function extractSubmission(payload) {
  return payload?.data?.submission ?? payload?.submission ?? payload?.data ?? payload ?? null;
}

function extractAnswers(subPayload) {
  const sub = subPayload;
  return sub?.answers_map ?? sub?.answers ?? sub?.data?.answers ?? sub?.data?.answers_map ?? null;
}

function toLabel(fieldKey) {
  return String(fieldKey)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function pickValueFromAnswerRow(a) {
  // Best human readable for choice fields
  if (a?.option_label) return a.option_label;

  // If backend uses option_key only
  if (a?.option_key && !a?.option_label) return a.option_key;

  if (a?.value_text !== null && a?.value_text !== undefined) return a.value_text;
  if (a?.value_number !== null && a?.value_number !== undefined) return a.value_number;
  if (a?.value_bool !== null && a?.value_bool !== undefined) return a.value_bool ? "Yes" : "No";
  if (a?.value_json !== null && a?.value_json !== undefined) return a.value_json;

  return "";
}

function prettifyAny(value) {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    // Render arrays as comma list
    return value.map((x) => prettifyAny(x)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    // Render objects as key/value lines (no raw JSON)
    const entries = Object.entries(value);
    if (!entries.length) return "";
    return entries
      .map(([k, v]) => `${toLabel(k)}: ${prettifyAny(v)}`)
      .join("\n");
  }

  return String(value);
}

function normalizeAnswersToFields(answers) {
  // Returns: [{ fieldKey, label, value }]
  // Supports:
  // - answers array of DB rows
  // - answers map
  if (!answers) return [];

  if (Array.isArray(answers)) {
    // Group by field_key (for checkbox multi-rows)
    const grouped = new Map();

    for (const a of answers) {
      const fieldKey = a.field_key ?? a.fieldKey ?? a.key ?? "";
      if (!fieldKey) continue;

      const label = a.label || toLabel(fieldKey);
      const v = pickValueFromAnswerRow(a);

      if (!grouped.has(fieldKey)) {
        grouped.set(fieldKey, { fieldKey, label, _values: [] });
      }
      const g = grouped.get(fieldKey);
      if (v !== "" && v !== null && v !== undefined) g._values.push(v);
    }

    const out = Array.from(grouped.values()).map((g) => {
      // If multiple values exist, treat as multi-select
      const val =
        g._values.length <= 1 ? g._values[0] ?? "" : g._values;

      return { fieldKey: g.fieldKey, label: g.label, value: val };
    });

    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }

  if (typeof answers === "object") {
    const out = Object.entries(answers).map(([k, v]) => ({
      fieldKey: k,
      label: toLabel(k),
      value: v,
    }));
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }

  return [];
}

function InfoItem({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value || "-"}</div>
    </div>
  );
}

function AnswersViewer({ open, onClose, submissionId }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!open || !submissionId) return;

    async function load() {
      setLoading(true);
      setErr(null);
      setSubmission(null);
      setFields([]);

      try {
        const res = await fetch(`/api/admin/submissions/${submissionId}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        const ct = res.headers.get("content-type") || "";
        const payload = ct.includes("application/json")
          ? await res.json()
          : { message: await res.text() };

        if (!res.ok) throw new Error(payload?.message || "Failed to load submission");

        const sub = extractSubmission(payload);
        const ans = extractAnswers(sub) ?? extractAnswers(payload) ?? null;

        setSubmission(sub);
        setFields(normalizeAnswersToFields(ans));
      } catch (e) {
        setErr(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open, submissionId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full md:w-[720px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-gray-900">
              Submission #{submissionId}
            </div>
            <div className="text-sm text-gray-600">
              {submission?.form_type_name ? `Form: ${submission.form_type_name}` : "Individual Response"}
            </div>
          </div>

          <button
            type="button"
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4 overflow-auto">
          {loading && <div className="text-sm text-gray-600">Loading...</div>}
          {err && <div className="text-sm text-red-600">{err}</div>}

          {!loading && !err && (
            <>
              {/* Top info block (like your screenshot) */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <InfoItem label="Year" value={String(submission?.year ?? "")} />
                <InfoItem label="Status" value={submission?.status ?? ""} />
                <InfoItem label="Source" value={submission?.source ?? ""} />
                <InfoItem label="Submitted At" value={formatDate(submission?.submitted_at)} />
              </div>

              <div className="text-sm font-semibold text-gray-900 mb-2">Answers</div>

              {fields.length === 0 ? (
                <div className="text-sm text-gray-600">No answers saved yet.</div>
              ) : (
                <div className="space-y-3">
                  {fields.map((f) => (
                    <div key={f.fieldKey} className="border rounded-lg p-3">
                      <div className="text-xs text-gray-500">{f.fieldKey}</div>
                      <div className="text-sm font-medium text-gray-900">{f.label}</div>

                      {/* Pretty value (no JSON look) */}
                      <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
                        {prettifyAny(f.value) || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubmissionsTable({ refreshKey = 0 }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "form_type_name", label: "Form" },
      { key: "year", label: "Year" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
      { key: "submitted_at", label: "Submitted" },
      { key: "__actions", label: "Actions" },
    ],
    []
  );

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      if (status) params.set("status", status);
      if (source) params.set("source", source);

      const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

      const list = extractRows(payload);

      setRows(
        list.map((r) => ({
          ...r,
          created_at: formatDate(r.created_at),
          submitted_at: formatDate(r.submitted_at),
          __actions: (
            <button
              type="button"
              className="text-indigo-600 hover:underline text-sm"
              onClick={() => {
                setActiveId(r.id);
                setViewerOpen(true);
              }}
            >
              View
            </button>
          ),
        }))
      );
    } catch (e) {
      setRows([]);
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, status, source, refreshKey]);

  return (
    <>
      <AnswersViewer
        open={viewerOpen}
        submissionId={activeId}
        onClose={() => {
          setViewerOpen(false);
          setActiveId(null);
        }}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">Submissions</div>
            <div className="text-sm text-gray-600">Records created from Admin and mobile sources.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div>
              <label className="block text-xs text-gray-600">Year</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-28"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600">Status</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600">Source</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">All</option>
                <option value="admin">Admin</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>

            <button
              type="button"
              className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
              onClick={load}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : (
            <DataTable columns={columns} rows={rows ?? []} />
          )}
          {!loading && !error && (
            <div className="mt-2 text-xs text-gray-500">Rows: {rows?.length ?? 0}</div>
          )}
        </div>
      </div>
    </>
  );
}
