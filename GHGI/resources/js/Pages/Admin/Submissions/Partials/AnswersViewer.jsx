// resources/js/Pages/Admin/Management/Partials/AnswersViewer.jsx
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

function extractAnswersFromPayload(payload) {
  // supports:
  // - payload.data.answers (array/map)
  // - payload.answers (array/map)
  // - payload.data.submission.answers (array/map)
  const sub = extractSubmission(payload);
  return (
    sub?.answers ??
    sub?.answers_map ??
    sub?.answersMap ??
    payload?.data?.answers ??
    payload?.answers ??
    payload?.data?.answers_map ??
    payload?.data?.answersMap ??
    null
  );
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
    // YYYY-MM-DD
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

function normalizeAnswersToFields(answers) {
  if (!answers) return [];

  // Array of DB rows
  if (Array.isArray(answers)) {
    const grouped = new Map();

    for (const a of answers) {
      const fieldKey = a.field_key ?? a.fieldKey ?? a.key ?? "";
      if (!fieldKey) continue;

      const label = a.label || toLabel(fieldKey);
      const v = pickValueFromAnswerRow(a);

      if (!grouped.has(fieldKey)) grouped.set(fieldKey, { fieldKey, label, _values: [] });
      const g = grouped.get(fieldKey);

      if (v !== "" && v !== null && v !== undefined) g._values.push(v);
    }

    const out = Array.from(grouped.values()).map((g) => {
      const value = g._values.length <= 1 ? g._values[0] ?? "" : g._values;
      return { fieldKey: g.fieldKey, label: g.label, value };
    });

    out.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return out;
  }

  // Map { field_key: value }
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

function Pager({ index, total, onPrev, onNext, disabled }) {
  if (!total || total <= 1) return null;

  const canPrev = index > 0 && !disabled;
  const canNext = index < total - 1 && !disabled;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="h-8 w-8 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous submission"
        title="Previous"
      >
        ←
      </button>

      <div className="text-xs text-gray-600 tabular-nums">
        {index + 1} <span className="text-gray-400">of</span> {total}
      </div>

      <button
        type="button"
        className="h-8 w-8 rounded border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next submission"
        title="Next"
      >
        →
      </button>
    </div>
  );
}

/**
 * Props:
 *  - open: boolean
 *  - onClose: fn
 *  - startId: number|string (the clicked submission id)
 *  - submissionIds: number[] (IDs shown in the table, in the same order)
 */
export default function AnswersViewer({ open, onClose, startId, submissionIds = [] }) {
  const ids = useMemo(() => (Array.isArray(submissionIds) ? submissionIds.filter(Boolean) : []), [submissionIds]);

  const startIndex = useMemo(() => {
    if (!ids.length) return -1;
    const i = ids.findIndex((x) => String(x) === String(startId));
    return i >= 0 ? i : 0;
  }, [ids, startId]);

  const [index, setIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [submission, setSubmission] = useState(null);
  const [fields, setFields] = useState([]);

  const activeId = useMemo(() => (ids.length ? ids[index] : startId), [ids, index, startId]);
  const total = ids.length || (startId ? 1 : 0);

  // When opening OR when startId changes, align to that id
  useEffect(() => {
    if (!open) return;
    if (startIndex >= 0) setIndex(startIndex);
  }, [open, startIndex]);

  // Load the active submission (by page index)
  useEffect(() => {
    if (!open) return;
    if (!activeId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      setSubmission(null);
      setFields([]);

      try {
        const res = await fetch(`/api/admin/submissions/${activeId}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        const ct = res.headers.get("content-type") || "";
        const payload = ct.includes("application/json") ? await res.json() : { message: await res.text() };

        if (!res.ok) throw new Error(payload?.message || "Failed to load submission");

        const sub = extractSubmission(payload);
        const ans = extractAnswersFromPayload(payload);

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
  }, [open, activeId]);

  // Keyboard navigation (optional but useful)
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
      if (!ids.length) return;

      if (e.key === "ArrowLeft") {
        setIndex((i) => (i > 0 ? i - 1 : i));
      } else if (e.key === "ArrowRight") {
        setIndex((i) => (i < ids.length - 1 ? i + 1 : i));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, ids.length, onClose, ids]);

  const headerTitle = useMemo(() => {
    const formName = submission?.form_type_name || submission?.formTypeName;
    const left = activeId ? `Submission #${activeId}` : "Submission";
    return formName ? `${left} • ${formName}` : left;
  }, [activeId, submission]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full md:w-[760px] bg-white shadow-xl border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-gray-900">{headerTitle}</div>
              <div className="text-sm text-gray-600">Individual</div>
            </div>

            <div className="flex items-center gap-3">
              <Pager
                index={Math.max(0, ids.length ? index : 0)}
                total={total}
                disabled={loading}
                onPrev={() => setIndex((i) => (i > 0 ? i - 1 : i))}
                onNext={() => setIndex((i) => (i < ids.length - 1 ? i + 1 : i))}
              />

              <button
                type="button"
                className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-auto">
          {loading && <div className="text-sm text-gray-600">Loading...</div>}
          {err && <div className="text-sm text-red-600">{err}</div>}

          {!loading && !err && (
            <>
              {/* top info block */}
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
