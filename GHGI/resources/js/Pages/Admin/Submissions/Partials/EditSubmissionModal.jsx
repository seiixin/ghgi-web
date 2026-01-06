// resources/js/Pages/Admin/Submissions/Partials/EditSubmissionModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import FormPicker from "./FormPicker";
import FormRendererFromMapping from "./FormRendererFromMapping";

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

function toFieldMetaFromSchemaFields(schemaFields = []) {
  const meta = {};
  (Array.isArray(schemaFields) ? schemaFields : []).forEach((f) => {
    if (!f?.key) return;
    meta[f.key] = {
      key: f.key,
      label: f.label ?? f.key,
      type: f.type ?? "text",
      required: !!f.required,
      options: Array.isArray(f.options) ? f.options : [],
    };
  });
  return meta;
}

function mappingFromSchemaFields(schemaFields = []) {
  const obj = {};
  (Array.isArray(schemaFields) ? schemaFields : []).forEach((f) => {
    if (!f?.key) return;
    obj[f.key] = null;
  });
  return obj;
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

function buildAnswersMapFromPayload(payload) {
  const raw =
    payload?.data?.answers_map ??
    payload?.data?.submission?.answers_map ??
    payload?.answers_map ??
    payload?.data?.answers ??
    payload?.data?.submission?.answers ??
    payload?.answers ??
    null;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;

  if (Array.isArray(raw)) {
    const map = {};
    for (const a of raw) {
      const k = a?.field_key ?? a?.fieldKey ?? a?.key ?? "";
      if (!k) continue;

      const v =
        a?.option_label ??
        a?.optionLabel ??
        a?.value_text ??
        a?.value_number ??
        (a?.value_bool !== null && a?.value_bool !== undefined ? a.value_bool : undefined) ??
        a?.value_json ??
        a?.value ??
        "";

      if (map[k] === undefined) map[k] = v;
      else {
        const prev = map[k];
        map[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
      }
    }
    return map;
  }

  return {};
}

function ModalShell({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-[min(980px,95vw)] max-h-[90vh] overflow-auto rounded-xl shadow-lg border">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <button type="button" className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function EditSubmissionModal({ open, submissionId, onClose, onSavedOrSubmitted }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState(currentYear);
  const [selectedForm, setSelectedForm] = useState(null);
  const [submission, setSubmission] = useState(null);

  const [schemaLoading, setSchemaLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [schemaMapping, setSchemaMapping] = useState({});
  const [fieldMeta, setFieldMeta] = useState({});
  const [answers, setAnswers] = useState({});

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function loadSchemaForSelectedForm(formTypeId, y, { alsoReturnFormRow = false } = {}) {
    if (!formTypeId) return null;

    setSchemaLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/forms?year=${encodeURIComponent(String(y))}&active=all`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to load forms (${res.status})`);

      const forms = normalizeFormsList(payload);
      const row = forms.find((x) => String(x.id) === String(formTypeId));
      if (!row) throw new Error("Form not found");

      const { fields } = schemaFieldsFromFormRow(row);
      if (!fields.length) throw new Error("This form has no schema fields for the selected year.");

      setFieldMeta(toFieldMetaFromSchemaFields(fields));
      setSchemaMapping(mappingFromSchemaFields(fields));

      return alsoReturnFormRow ? row : null;
    } catch (e) {
      setFieldMeta({});
      setSchemaMapping({});
      setErr(e?.message || "Failed to load schema fields");
      return null;
    } finally {
      setSchemaLoading(false);
    }
  }

  async function loadExisting() {
    if (!open || !submissionId) return;

    setInitialLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to load submission (${res.status})`);

      const sub = payload?.data?.submission ?? payload?.submission ?? payload?.data ?? null;
      if (!sub?.id) throw new Error("No submission found.");

      const formTypeId = sub?.form_type_id ?? sub?.formTypeId ?? sub?.form_type?.id ?? sub?.formType?.id;
      const y = sub?.year ?? currentYear;
      if (!formTypeId) throw new Error("Submission missing form_type_id.");

      setSubmission(sub);
      setYear(Number(y));

      const formRow = await loadSchemaForSelectedForm(formTypeId, Number(y), { alsoReturnFormRow: true });
      setSelectedForm(formRow || { id: formTypeId });

      const ansMap = buildAnswersMapFromPayload(payload);
      setAnswers(ansMap || {});

      setMsg(`Editing Submission #${sub.id}`);
    } catch (e) {
      setErr(e?.message || "Failed to load submission");
      setSubmission(null);
      setSelectedForm(null);
      setFieldMeta({});
      setSchemaMapping({});
      setAnswers({});
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submissionId]);

  // if user changes form/year inside edit, reload schema
  useEffect(() => {
    if (!open) return;
    if (!selectedForm?.id) return;
    loadSchemaForSelectedForm(selectedForm.id, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm?.id, year, open]);

  async function patchSubmissionMetaIfNeeded() {
    if (!submission?.id) return;

    const body = {
      year,
      form_type_id: selectedForm?.id,
    };

    const res = await fetch(`/api/admin/submissions/${submission.id}`, {
      method: "PATCH",
      headers: apiHeaders({ json: true }),
      credentials: "same-origin",
      body: JSON.stringify(body),
    });

    const payload = await readPayload(res);
    if (!res.ok) throw new Error(payload?.message || `Failed to update submission meta (${res.status})`);

    const sub = payload?.data?.submission ?? payload?.submission ?? payload?.data ?? null;
    if (sub?.id) setSubmission(sub);
  }

  async function saveDraft() {
    if (!submission?.id) return;

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      await patchSubmissionMetaIfNeeded();

      const res = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders({ json: true }),
        credentials: "same-origin",
        body: JSON.stringify({ answers, mode: "draft" }),
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to save answers (${res.status})`);

      setMsg("Saved changes (draft).");
      onSavedOrSubmitted?.();
    } catch (e) {
      setErr(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!submission?.id) return;

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      await patchSubmissionMetaIfNeeded();

      const res1 = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders({ json: true }),
        credentials: "same-origin",
        body: JSON.stringify({ answers, mode: "submit" }),
      });

      const p1 = await readPayload(res1);
      if (!res1.ok) throw new Error(p1?.message || `Save answers failed (${res1.status})`);

      const res2 = await fetch(`/api/admin/submissions/${submission.id}/submit`, {
        method: "POST",
        headers: apiHeaders({ json: false }),
        credentials: "same-origin",
      });

      const p2 = await readPayload(res2);
      if (!res2.ok) throw new Error(p2?.message || `Submit failed (${res2.status})`);

      setMsg("Submitted.");
      onSavedOrSubmitted?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell open={open} title={`Edit Submission #${submissionId ?? ""}`} onClose={onClose}>
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}

      {initialLoading ? (
        <div className="text-sm text-gray-600">Loading submission…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Year</label>
              <input
                type="number"
                className="border rounded px-2 py-2 text-sm w-full"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-2">
              <FormPicker year={year} value={selectedForm} onChange={setSelectedForm} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className="border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              onClick={saveDraft}
              disabled={busy || !submission?.id}
            >
              Save Changes
            </button>

            <button
              type="button"
              className="bg-green-600 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
              onClick={submit}
              disabled={busy || !submission?.id}
            >
              Submit
            </button>

            {schemaLoading ? <div className="text-xs text-gray-500 ml-2">Loading schema fields…</div> : null}
          </div>

          {submission?.id ? (
            <div className="text-sm text-gray-700">
              Active Submission ID: <span className="font-semibold">#{submission.id}</span>
            </div>
          ) : null}

          {selectedForm?.id ? (
            <FormRendererFromMapping
              mapping={schemaMapping}
              fieldMeta={fieldMeta}
              answers={answers}
              onChange={setAnswers}
            />
          ) : null}

          {selectedForm?.id ? <div className="text-xs text-gray-400">Loaded fields: {Object.keys(fieldMeta || {}).length}</div> : null}
        </div>
      )}
    </ModalShell>
  );
}
