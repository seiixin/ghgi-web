import React, { useEffect, useMemo, useState } from "react";

function formatDate(v) {
  try {
    if (!v) return "";
    return new Date(v).toLocaleString();
  } catch {
    return v ?? "";
  }
}

function toLabel(fieldKey) {
  return String(fieldKey || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function extractSubmission(payload) {
  return payload?.data?.submission ?? payload?.submission ?? payload?.data ?? payload ?? null;
}

/**
 * ✅ IMPORTANT: support BOTH response shapes:
 * New controller: { data: { submission, answers, answers_human } }
 * Old viewer: submission.answers / submission.answers_map / etc
 */
function extractAnswersAny(payload, submission) {
  // 1) Best: answers_human (already human readable)
  const ah =
    payload?.data?.answers_human ??
    payload?.answers_human ??
    submission?.answers_human ??
    submission?.answersHuman ??
    null;
  if (ah) return ah;

  // 2) Next: answers array (db rows)
  const a =
    payload?.data?.answers ??
    payload?.answers ??
    submission?.answers ??
    submission?.data?.answers ??
    null;
  if (a) return a;

  // 3) Next: answers_map
  const am =
    payload?.data?.answers_map ??
    payload?.answers_map ??
    submission?.answers_map ??
    submission?.answersMap ??
    submission?.data?.answers_map ??
    null;
  if (am) return am;

  return null;
}

function pickValueFromAnswerRow(a) {
  // works for both:
  // - answers_human rows: { field_key, label, type, value, option_label }
  // - db rows: { value_text, value_number, value_bool, value_json, option_label, option_key }
  if (a?.value !== null && a?.value !== undefined && a?.value !== "") return a.value;

  if (a?.option_label) return a.option_label;
  if (a?.optionLabel) return a.optionLabel;

  if (a?.value_text !== null && a?.value_text !== undefined && String(a.value_text).trim() !== "")
    return a.value_text;

  if (a?.value_number !== null && a?.value_number !== undefined) return a.value_number;

  if (a?.value_bool !== null && a?.value_bool !== undefined) return a.value_bool ? "Yes" : "No";

  if (a?.value_json !== null && a?.value_json !== undefined) return a.value_json;

  if (a?.option_key && !a?.option_label) return a.option_key;

  return "";
}

function prettifyAny(value) {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    if (!value.length) return "";
    return value.map((x) => prettifyAny(x)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "";
    return entries
      .map(([k, v]) => `${toLabel(k)}: ${prettifyAny(v)}`)
      .filter(Boolean)
      .join("\n");
  }

  return String(value);
}

function normalizeAnswersToFields(answers) {
  // Returns: [{ fieldKey, label, value }]
  if (!answers) return [];

  // answers_human / answers rows as array
  if (Array.isArray(answers)) {
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
      const val = g._values.length <= 1 ? g._values[0] ?? "" : g._values;
      return { fieldKey: g.fieldKey, label: g.label, value: val };
    });

    out.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return out;
  }

  // answers_map object
  if (typeof answers === "object") {
    const out = Object.entries(answers).map(([k, v]) => ({
      fieldKey: k,
      label: toLabel(k),
      value: v,
    }));
    out.sort((a, b) => String(a.label).localeCompare(String(b.label)));
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

export default function AnswersViewer({ open, onClose, submissionId }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!open || !submissionId) return;

    let cancelled = false;

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
        const ans = extractAnswersAny(payload, sub);

        const normalized = normalizeAnswersToFields(ans);

        if (cancelled) return;
        setSubmission(sub);
        setFields(normalized);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, submissionId]);

  const headerTitle = useMemo(() => {
    const formName = submission?.form_type_name || submission?.formTypeName;
    return formName ? `Submission #${submissionId} • ${formName}` : `Submission #${submissionId}`;
  }, [submissionId, submission]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full md:w-[720px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-gray-900">{headerTitle}</div>
            <div className="text-sm text-gray-600">Individual Response</div>
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
