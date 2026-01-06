import React, { useEffect, useMemo, useState } from "react";
import FormPicker from "./FormPicker";
import FormRendererFromMapping from "./FormRendererFromMapping";

/**
 * Fix for 419 (CSRF mismatch):
 * - Adds X-CSRF-TOKEN + X-Requested-With headers to ALL non-GET requests
 * - Uses same-origin cookies
 *
 * Requirement:
 * - Your main Blade layout must include:
 *   <meta name="csrf-token" content="{{ csrf_token() }}">
 */
export default function NewSubmissionWizard({ onCreatedOrSubmitted }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState(currentYear);

  const [selectedForm, setSelectedForm] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [answers, setAnswers] = useState({});

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  function getCsrfToken() {
    const el = document.querySelector('meta[name="csrf-token"]');
    return el ? el.getAttribute("content") : "";
  }

  function apiHeaders(isJson = true) {
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-TOKEN": getCsrfToken(),
    };
    if (isJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  async function safeJson(res) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return await res.json();
    const text = await res.text();
    return { message: text };
  }

  useEffect(() => {
    setSelectedForm(null);
    setSubmission(null);
    setMapping(null);
    setAnswers({});
    setMsg(null);
    setErr(null);
  }, [year]);

  async function createSubmission() {
    if (!selectedForm?.id) return;

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/submissions`, {
        method: "POST",
        headers: apiHeaders(true),
        credentials: "same-origin",
        body: JSON.stringify({ form_type_id: selectedForm.id, year }),
      });

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to create submission");

      const sub = payload?.data?.submission ?? payload?.submission ?? payload?.data ?? null;
      const mappingJson =
        payload?.data?.mapping_json ??
        payload?.mapping_json ??
        sub?.mapping_json ??
        payload?.mapping ??
        null;

      setSubmission(sub);
      setMapping(mappingJson || {});
      setMsg(`Submission #${sub?.id} created.`);
      if (typeof onCreatedOrSubmitted === "function") onCreatedOrSubmitted();
    } catch (e) {
      setErr(e?.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!submission?.id) return;

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders(true),
        credentials: "same-origin",
        body: JSON.stringify({ answers, mode: "draft" }),
      });

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to save answers");

      setMsg("Saved draft.");
      if (typeof onCreatedOrSubmitted === "function") onCreatedOrSubmitted();
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
      // 1) Save answers
      const res = await fetch(`/api/admin/submissions/${submission.id}/answers`, {
        method: "PATCH",
        headers: apiHeaders(true),
        credentials: "same-origin",
        body: JSON.stringify({ answers, mode: "submit" }),
      });

      const payload = await safeJson(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to save answers");

      // 2) Submit
      const r2 = await fetch(`/api/admin/submissions/${submission.id}/submit`, {
        method: "POST",
        headers: apiHeaders(false),
        credentials: "same-origin",
      });

      const p2 = await safeJson(r2);
      if (!r2.ok) throw new Error(p2?.message || "Submit failed");

      setMsg("Submitted.");
      if (typeof onCreatedOrSubmitted === "function") onCreatedOrSubmitted();
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

        <div className="flex flex-wrap gap-2">
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
        </div>

        {submission?.id && (
          <div className="text-sm text-gray-700">
            Active Submission ID: <span className="font-semibold">#{submission.id}</span>
          </div>
        )}

        {submission?.id && (
          <FormRendererFromMapping mapping={mapping || {}} answers={answers} onChange={setAnswers} />
        )}
      </div>
    </div>
  );
}
