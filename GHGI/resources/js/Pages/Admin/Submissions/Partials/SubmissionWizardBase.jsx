// resources/js/Pages/Admin/Submissions/Partials/SubmissionWizardBase.jsx
import React, { useEffect, useMemo, useState } from "react";
import FormPicker from "./FormPicker";
import FormRendererFromMapping from "./FormRendererFromMapping";

/**
 * CHANGE SUMMARY (as requested)
 * - No more "Year" input.
 * - Admin just selects a form.
 * - We auto-pick the active schema version from the form row.
 * - We derive the year label from schema version (if available) and display it like: "(2023)".
 * - When creating/updating submission, we send `year` derived from schema version (fallback: currentYear).
 *
 * Notes:
 * - This assumes your /api/admin/forms?active=all returns form rows with `schema_versions` that includes:
 *   - status: "active"
 *   - (optional) year OR effective_year OR schema_year (we handle multiple keys)
 */

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

function compactYearBadge(year) {
  if (!year) return "";
  return `(${year})`;
}

export default function SubmissionWizardBase({
  mode = "create", // "create" | "edit"
  initialSubmissionId = null,
  onCreatedOrSubmitted,
  onDone, // optional (close modal after save/submit)
}) {
  const isEdit = mode === "edit";
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [selectedForm, setSelectedForm] = useState(null);

  const [busy, setBusy] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const [submission, setSubmission] = useState(null);

  // schema-driven render
  const [schemaMapping, setSchemaMapping] = useState({});
  const [fieldMeta, setFieldMeta] = useState({});
  const [answers, setAnswers] = useState({});

  // derived from selected form's active schema version
  const [activeSchema, setActiveSchema] = useState(null);
  const schemaYear = useMemo(() => deriveSchemaYear(activeSchema), [activeSchema]);
  const effectiveYearToSend = schemaYear ?? currentYear;

  async function loadFormRowById(formTypeId) {
    if (!formTypeId) return null;

    const res = await fetch(`/api/admin/forms?active=all`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });

    const payload = await readPayload(res);
    if (!res.ok) throw new Error(payload?.message || `Failed to load forms (${res.status})`);

    const forms = normalizeFormsList(payload);
    const row = forms.find((x) => String(x.id) === String(formTypeId));
    if (!row) throw new Error("Form not found");
    return row;
  }

  async function loadSchemaForFormRow(formRow) {
    if (!formRow?.id) return;

    setSchemaLoading(true);
    setErr(null);

    try {
      const { fields, activeSchema: act } = schemaFieldsFromFormRow(formRow);

      if (!fields.length) throw new Error("This form has no schema fields for the active version.");

      const meta = toFieldMetaFromSchemaFields(fields);
      const map = mappingFromSchemaFields(fields);

      if (fields.length > 0 && Object.keys(meta).length === 0) {
        throw new Error("Schema fields found but could not build meta. Check schema field keys.");
      }

      setActiveSchema(act || null);
      setFieldMeta(meta);
      setSchemaMapping(map);
    } catch (e) {
      setActiveSchema(null);
      setFieldMeta({});
      setSchemaMapping({});
      setErr(e?.message || "Failed to load schema fields");
    } finally {
      setSchemaLoading(false);
    }
  }

  async function loadExistingSubmission(submissionId) {
    if (!submissionId) return;

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
      if (!formTypeId) throw new Error("Submission missing form_type_id.");

      setSubmission(sub);

      // Load form row and schema (no year input)
      const formRow = await loadFormRowById(formTypeId);
      setSelectedForm(formRow);
      await loadSchemaForFormRow(formRow);

      // Prefill answers
      const ansMap = buildAnswersMapFromPayload(payload);
      setAnswers(ansMap || {});

      setMsg(`Editing Submission #${sub.id}`);
    } catch (e) {
      setErr(e?.message || "Failed to load submission for edit");
      setSubmission(null);
      setSelectedForm(null);
      setActiveSchema(null);
      setFieldMeta({});
      setSchemaMapping({});
      setAnswers({});
    } finally {
      setInitialLoading(false);
    }
  }

  // init edit
  useEffect(() => {
    if (!isEdit) return;
    loadExistingSubmission(initialSubmissionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialSubmissionId]);

  // when selected form changes: build schema from the selected form row
  useEffect(() => {
    if (!selectedForm?.id) return;
    loadSchemaForFormRow(selectedForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm?.id]);

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
        body: JSON.stringify({ form_type_id: selectedForm.id, year: effectiveYearToSend }),
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

  async function patchSubmissionMetaIfNeeded() {
    if (!submission?.id) return;

    // keep submission form/year in sync (year derived from selected form schema)
    const body = {
      year: effectiveYearToSend,
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
    if (!submission?.id) {
      setErr(isEdit ? "Missing submission id." : "Create submission first.");
      return;
    }

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

      setMsg(isEdit ? "Saved changes (draft)." : "Saved draft.");
      onCreatedOrSubmitted?.();
    } catch (e) {
      setErr(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!submission?.id) {
      setErr(isEdit ? "Missing submission id." : "Create submission first.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      await patchSubmissionMetaIfNeeded();

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
        headers: apiHeaders({ json: false }),
        credentials: "same-origin",
      });

      const p2 = await readPayload(res2);
      if (!res2.ok) throw new Error(p2?.message || `Submit failed (${res2.status})`);

      setMsg("Submitted.");
      onCreatedOrSubmitted?.();
      onDone?.();
    } catch (e) {
      setErr(e?.message || "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  const yearBadge = compactYearBadge(schemaYear);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="text-base font-semibold text-gray-900">{isEdit ? "Edit Submission" : "New Submission"}</div>
        <div className="text-sm text-gray-600">
          {isEdit
            ? "Load an existing submission and update mapped fields."
            : "Select a form, create a submission, and fill out mapped fields."}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-700">{msg}</div>}

        {initialLoading ? (
          <div className="text-sm text-gray-600">Loading submission…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs text-gray-600">Form</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    {/* FormPicker no longer needs year */}
                    <FormPicker value={selectedForm} onChange={setSelectedForm} />
                  </div>

                  {selectedForm?.id ? (
                    <div className="shrink-0 text-xs font-semibold text-gray-700 border rounded px-2 py-2 bg-gray-50">
                      {yearBadge || `(Year N/A)`}
                    </div>
                  ) : null}
                </div>

                {schemaYear ? (
                  <div className="mt-1 text-xs text-gray-500">Schema year: {schemaYear}</div>
                ) : selectedForm?.id ? (
                  <div className="mt-1 text-xs text-gray-500">Schema year not found on active schema version.</div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {!isEdit ? (
                <button
                  type="button"
                  className="bg-indigo-600 text-white rounded px-4 py-2 text-sm disabled:opacity-60"
                  onClick={createSubmission}
                  disabled={busy || !selectedForm?.id}
                >
                  Create Submission
                </button>
              ) : null}

              <button
                type="button"
                className="border rounded px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                onClick={saveDraft}
                disabled={busy || !submission?.id}
              >
                {isEdit ? "Save Changes" : "Save Draft"}
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
              <FormRendererFromMapping mapping={schemaMapping} fieldMeta={fieldMeta} answers={answers} onChange={setAnswers} />
            ) : null}

            {selectedForm?.id ? <div className="text-xs text-gray-400">Loaded fields: {Object.keys(fieldMeta || {}).length}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}
