import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../../../../Components/Shared/DataTable";
import AnswersViewer from "./AnswersViewer";

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
  return f?.name ?? f?.code ?? f?.key ?? `Form #${f?.id ?? ""}`;
}

function FormList({
  forms,
  activeId,
  onSelect,
  search,
  setSearch,
  loading,
  error,
  onReload,
}) {
  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const list = Array.isArray(forms) ? forms : [];
    if (!q) return list;
    return list.filter((f) => {
      const blob = `${f.id} ${f.name ?? ""} ${f.code ?? ""} ${f.key ?? ""} ${f.sector_key ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [forms, search]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-gray-900">Forms</div>
          <div className="text-sm text-gray-600">Select a form to view its submissions.</div>
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
                      <div className="text-sm font-semibold text-gray-900">{asFormLabel(f)}</div>
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
  // Left: forms
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);
  const [formSearch, setFormSearch] = useState("");

  const [activeForm, setActiveForm] = useState(null);

  // Right: submissions for selected form
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [year, setYear] = useState(""); // optional filter only, not required
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);

  const columns = useMemo(
    () => [
      { key: "id", label: "ID" },
      { key: "year", label: "Year" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
      { key: "submitted_at", label: "Submitted" },
      { key: "__actions", label: "Actions" },
    ],
    []
  );

  async function loadForms() {
    setFormsLoading(true);
    setFormsError(null);

    try {
      // We purposely do NOT lock to a year here.
      // This endpoint must return schema_versions etc like your FormsView uses.
      const res = await fetch(`/api/admin/forms?active=all`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await res.json() : { message: await res.text() };

      if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

      const list = normalizeFormsList(payload);

      // sort by name for UX
      list.sort((a, b) => asFormLabel(a).localeCompare(asFormLabel(b)));

      setForms(list);

      // keep selection stable
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

      const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await res.json() : { message: await res.text() };

      if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

      const list = extractRows(payload);

      const normalized = (Array.isArray(list) ? list : []).map((r) => ({
        ...r,
        created_at: formatDate(r.created_at),
        submitted_at: formatDate(r.submitted_at),
        __actions: (
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

  // initial load
  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh forms list when parent asks
  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // load submissions when selection/filter changes
  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeForm?.id, status, source, year, refreshKey]);

  return (
    <>
      <AnswersViewer
        open={viewerOpen}
        submissionId={activeSubmissionId}
        onClose={() => {
          setViewerOpen(false);
          setActiveSubmissionId(null);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Forms */}
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

        {/* Right: Submissions */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-base font-semibold text-gray-900">
                  Submissions {activeForm?.id ? <span className="text-gray-500 font-normal">• {asFormLabel(activeForm)}</span> : null}
                </div>
                <div className="text-sm text-gray-600">
                  Showing submissions for the selected form.
                </div>
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
                  onClick={loadSubmissions}
                  disabled={loading || !activeForm?.id}
                >
                  Refresh
                </button>
              </div>
            </div>

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
          </div>
        </div>
      </div>
    </>
  );
}
