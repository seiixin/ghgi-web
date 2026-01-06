// resources/js/Pages/Admin/Submissions/Partials/EditSubmissionModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import FormPicker from "./FormPicker";
import FormRendererFromMapping from "./FormRendererFromMapping";

// Location reference data (static JSON)
import barangaysJson from "../../Map/laguna_barangays_list.json";
import municitiesJson from "../../Map/laguna_municities_list.json";

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

function uniqSorted(arr) {
  return Array.from(new Set((arr || []).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
}

function normalizeRows(jsonObj) {
  const rows = jsonObj?.rows ?? jsonObj?.data?.rows ?? jsonObj?.data ?? [];
  return Array.isArray(rows) ? rows : [];
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

export default function EditSubmissionModal({ open, submissionId, onClose, onSavedOrSubmitted }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
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

  // Active schema (for derived year only; no year input)
  const [activeSchema, setActiveSchema] = useState(null);
  const schemaYear = useMemo(() => deriveSchemaYear(activeSchema), [activeSchema]);
  const effectiveYearToSend = schemaYear ?? (submission?.year ?? currentYear);

  // ----- LOCATION STATE (added) -----
  const munRows = useMemo(() => normalizeRows(municitiesJson), []);
  const brgyRows = useMemo(() => normalizeRows(barangaysJson), []);

  const regionOptions = useMemo(() => uniqSorted(munRows.map((r) => r?.reg_name).filter(Boolean)), [munRows]);
  const provinceOptions = useMemo(() => uniqSorted(munRows.map((r) => r?.prov_name).filter(Boolean)), [munRows]);

  const [regName, setRegName] = useState("");
  const [provName, setProvName] = useState("Laguna");
  const [cityName, setCityName] = useState("");
  const [brgyName, setBrgyName] = useState("");

  const cityOptions = useMemo(() => {
    const rows = munRows.filter((r) => {
      const okProv = !provName ? true : String(r?.prov_name) === String(provName);
      const okReg = !regName ? true : String(r?.reg_name) === String(regName);
      return okProv && okReg;
    });
    return uniqSorted(rows.map((r) => r?.city_name).filter(Boolean));
  }, [munRows, regName, provName]);

  const barangayOptions = useMemo(() => {
    if (!provName || !cityName) return [];
    const rows = brgyRows.filter(
      (r) => String(r?.prov_name) === String(provName) && String(r?.city_name) === String(cityName)
    );
    return uniqSorted(rows.map((r) => r?.brgy_name).filter(Boolean));
  }, [brgyRows, provName, cityName]);

  useEffect(() => {
    setCityName("");
    setBrgyName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regName]);

  useEffect(() => {
    setCityName("");
    setBrgyName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provName]);

  useEffect(() => {
    setBrgyName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName]);

  useEffect(() => {
    if (!regName && regionOptions.length === 1) setRegName(regionOptions[0]);
    if (!provName && provinceOptions.length === 1) setProvName(provinceOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionOptions.length, provinceOptions.length]);

  function locationPayload() {
    return {
      reg_name: regName || null,
      prov_name: provName || null,
      city_name: cityName || null,
      brgy_name: brgyName || null,
    };
  }

  function validateLocation({ strict = false } = {}) {
    const missing = [];
    if (!provName) missing.push("prov_name");
    if (!cityName) missing.push("city_name");
    if (strict && !brgyName) missing.push("brgy_name"); // backend currently requires on submit
    return missing;
  }

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

      setActiveSchema(act || null);
      setFieldMeta(toFieldMetaFromSchemaFields(fields));
      setSchemaMapping(mappingFromSchemaFields(fields));
      return formRow;
    } catch (e) {
      setActiveSchema(null);
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
      if (!formTypeId) throw new Error("Submission missing form_type_id.");

      setSubmission(sub);

      // Prefill location from submission (added)
      setRegName(sub?.reg_name ?? "");
      setProvName(sub?.prov_name ?? "Laguna");
      setCityName(sub?.city_name ?? "");
      setBrgyName(sub?.brgy_name ?? "");

      // Load form row and schema (no year filter)
      const formRow = await loadFormRowById(formTypeId);
      setSelectedForm(formRow || { id: formTypeId });
      if (formRow) await loadSchemaForFormRow(formRow);

      const ansMap = buildAnswersMapFromPayload(payload);
      setAnswers(ansMap || {});

      setMsg(`Editing Submission #${sub.id}`);
    } catch (e) {
      setErr(e?.message || "Failed to load submission");
      setSubmission(null);
      setSelectedForm(null);
      setActiveSchema(null);
      setFieldMeta({});
      setSchemaMapping({});
      setAnswers({});
      setRegName("");
      setProvName("Laguna");
      setCityName("");
      setBrgyName("");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submissionId]);

  useEffect(() => {
    if (!open) return;
    if (!selectedForm?.id) return;
    loadSchemaForFormRow(selectedForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForm?.id, open]);

  async function patchSubmissionMetaIfNeeded() {
    if (!submission?.id) return;

    const body = {
      year: effectiveYearToSend,
      form_type_id: selectedForm?.id,
      ...locationPayload(),
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
        body: JSON.stringify({
          answers,
          mode: "draft",
          ...locationPayload(),
        }),
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

    const missing = validateLocation({ strict: true });
    if (missing.length) {
      setErr(`Complete location first: ${missing.join(", ")}`);
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      await patchSubmissionMetaIfNeeded();

      const res1 = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders({ json: true }),
        credentials: "same-origin",
        body: JSON.stringify({
          answers,
          mode: "submit",
          ...locationPayload(),
        }),
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

  const schemaYearBadge = schemaYear ? `(${schemaYear})` : `(Year N/A)`;

  return (
    <ModalShell open={open} title={`Edit Submission #${submissionId ?? ""}`} onClose={onClose}>
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      {msg && <div className="text-sm text-green-700 mb-2">{msg}</div>}

      {initialLoading ? (
        <div className="text-sm text-gray-600">Loading submission…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-600">Form</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FormPicker value={selectedForm} onChange={setSelectedForm} />
                </div>
                {selectedForm?.id ? (
                  <div className="shrink-0 text-xs font-semibold text-gray-700 border rounded px-2 py-2 bg-gray-50">
                    {schemaYearBadge}
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

          {/* LOCATION UI (added) */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="text-sm font-semibold text-gray-900">Location</div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600">
                  Region <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                >
                  <option value="">Select region</option>
                  {regionOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600">
                  Province <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={provName}
                  onChange={(e) => setProvName(e.target.value)}
                >
                  <option value="">Select province</option>
                  {provinceOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600">
                  City/Municipality <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  disabled={!provName || !regName}
                >
                  <option value="">{!provName || !regName ? "Select region & province first" : "Select city/municity"}</option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600">
                  Barangay <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                  value={brgyName}
                  onChange={(e) => setBrgyName(e.target.value)}
                  disabled={!provName || !cityName}
                >
                  <option value="">{!provName || !cityName ? "Select city first" : "Select barangay"}</option>
                  {barangayOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Selected:{" "}
              <span className="font-medium text-gray-700">
                {provName || "—"}
                {cityName ? `, ${cityName}` : ""}
                {brgyName ? `, ${brgyName}` : ""}
              </span>
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
            <FormRendererFromMapping mapping={schemaMapping} fieldMeta={fieldMeta} answers={answers} onChange={setAnswers} />
          ) : null}

          {selectedForm?.id ? (
            <div className="text-xs text-gray-400">Loaded fields: {Object.keys(fieldMeta || {}).length}</div>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
}
