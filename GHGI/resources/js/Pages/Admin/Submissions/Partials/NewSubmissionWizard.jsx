import React, { useEffect, useMemo, useState } from "react";
import FormPicker from "./FormPicker";
import FormRendererFromMapping from "./FormRendererFromMapping";

function pickActiveSchema(schemaVersions = []) {
  const active = (schemaVersions || []).find((v) => v.status === "active");
  return active || (schemaVersions || [])[0] || null;
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

export default function NewSubmissionWizard({ onCreatedOrSubmitted }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState(currentYear);

  const [selectedForm, setSelectedForm] = useState(null);

  const [busy, setBusy] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const [submission, setSubmission] = useState(null);

  // schema-driven render
  const [schemaMapping, setSchemaMapping] = useState({});
  const [fieldMeta, setFieldMeta] = useState({});
  const [answers, setAnswers] = useState({});

  async function loadSchemaForSelectedForm(formTypeId, y) {
    if (!formTypeId) return;

    setSchemaLoading(true);
    setErr(null);

    try {
      const res = await fetch(
        `/api/admin/forms?year=${encodeURIComponent(String(y))}&active=all`,
        {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        }
      );

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to load forms (${res.status})`);

      const forms = normalizeFormsList(payload);
      const row = forms.find((x) => String(x.id) === String(formTypeId));
      if (!row) throw new Error("Form not found");

      const { fields } = schemaFieldsFromFormRow(row);

      if (!fields.length) throw new Error("This form has no schema fields for the selected year.");

      const meta = toFieldMetaFromSchemaFields(fields);
      const map = mappingFromSchemaFields(fields);

      if (fields.length > 0 && Object.keys(meta).length === 0) {
        throw new Error("Schema fields found but could not build meta. Check schema field keys.");
      }

      setFieldMeta(meta);
      setSchemaMapping(map);
    } catch (e) {
      setFieldMeta({});
      setSchemaMapping({});
      setErr(e?.message || "Failed to load schema fields");
    } finally {
      setSchemaLoading(false);
    }
  }

  // reset on year change
  useEffect(() => {
    setSubmission(null);
    setFieldMeta({});
    setSchemaMapping({});
    setAnswers({});
    setMsg(null);
    setErr(null);
  }, [year]);

  // load schema when form changes
  useEffect(() => {
    if (!selectedForm?.id) return;
    loadSchemaForSelectedForm(selectedForm.id, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm?.id, year]);

  async function createSubmission() {
    if (!selectedForm?.id) {
      setErr("Select a form first.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/submissions`, {
        method: "POST",
        headers: apiHeaders({ json: true }),
        credentials: "same-origin",
        body: JSON.stringify({ form_type_id: selectedForm.id, year }),
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to create submission (${res.status})`);

      const sub = payload?.data?.submission ?? payload?.submission ?? payload?.data ?? null;
      if (!sub?.id) throw new Error("Create succeeded but no submission id returned.");

      setSubmission(sub);
      setAnswers({});
      setMsg(`Submission #${sub.id} created.`);
      onCreatedOrSubmitted?.();
    } catch (e) {
      setErr(e?.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!submission?.id) {
      setErr("Create submission first.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders({ json: true }),
        credentials: "same-origin",
        body: JSON.stringify({ answers, mode: "draft" }),
      });

      const payload = await readPayload(res);
      if (!res.ok) throw new Error(payload?.message || `Failed to save answers (${res.status})`);

      setMsg("Saved draft.");
      onCreatedOrSubmitted?.();
    } catch (e) {
      setErr(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!submission?.id) {
      setErr("Create submission first.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      // 1) save answers
      const res1 = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders({ json: true }),
        credentials: "same-origin",
        body: JSON.stringify({ answers, mode: "submit" }),
      });

      const p1 = await readPayload(res1);
      if (!res1.ok) throw new Error(p1?.message || `Save answers failed (${res1.status})`);

      // 2) submit
      const res2 = await fetch(`/api/admin/submissions/${submission.id}/submit`, {
        method: "POST",
        headers: apiHeaders({ json: false }), // still includes CSRF
        credentials: "same-origin",
      });

      const p2 = await readPayload(res2);
      if (!res2.ok) throw new Error(p2?.message || `Submit failed (${res2.status})`);

      setMsg("Submitted.");
      onCreatedOrSubmitted?.();
    } catch (e) {
      setErr(e?.message || "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="text-base font-semibold text-gray-900">New Submission</div>
        <div className="text-sm text-gray-600">
          Create a submission, select a form, and fill out mapped fields.
        </div>
      </div>

      <div className="p-4 space-y-4">
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-700">{msg}</div>}

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
            className="bg-indigo-600 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
            onClick={createSubmission}
            disabled={busy || !selectedForm?.id}
          >
            Create Submission
          </button>

          <button
            type="button"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            onClick={saveDraft}
            disabled={busy || !submission?.id}
          >
            Save Draft
          </button>

          <button
            type="button"
            className="bg-green-600 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
            onClick={submit}
            disabled={busy || !submission?.id}
          >
            Submit
          </button>

          {schemaLoading ? (
            <div className="text-xs text-gray-500 ml-2">Loading schema fields…</div>
          ) : null}
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

        {selectedForm?.id ? (
          <div className="text-xs text-gray-400">
            Loaded fields: {Object.keys(fieldMeta || {}).length}
          </div>
        ) : null}
      </div>
    </div>
  );
}
