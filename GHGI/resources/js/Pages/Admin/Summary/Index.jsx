// resources/js/Pages/Admin/Summary/Index.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import EmptyState from "../../../Components/Shared/EmptyState";

// ---- shared helpers (same behavior as Map) ----
async function readJsonOrText(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const t = await res.text();
  return { message: t };
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

function pickActiveSchema(schemaVersions = []) {
  const active = (schemaVersions || []).find((v) => v.status === "active");
  return active || (schemaVersions || [])[0] || null;
}

function schemaForYear(form, year) {
  const versions = form?.schema_versions || form?.schemaVersions || [];
  const exact = (versions || []).find((v) => String(v.year) === String(year));
  return exact || pickActiveSchema(versions);
}

function asFormLabel(f) {
  return f?.name ?? f?.key ?? `Form #${f?.id ?? ""}`;
}

function safeNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

/**
 * EXACT SAME IDEA as Map:
 * 1) Prefer “co2e / ghg emissions / emissions co2e” keys
 * 2) Else fallback: sum all numeric-ish values
 */
function computeEmissionFromAnswers(answersMap) {
  if (!answersMap || typeof answersMap !== "object") return 0;

  const co2eCandidates = Object.entries(answersMap).filter(([k]) =>
    /co2e|ghg.*emissions|ghg_emissions|emissions.*co2e/i.test(String(k))
  );

  for (const [, v] of co2eCandidates) {
    if (Array.isArray(v)) {
      const nums = v.map(safeNum).filter((n) => n !== null);
      if (nums.length) return nums.reduce((a, b) => a + b, 0);
    } else {
      const n = safeNum(v);
      if (n !== null) return n;
    }
  }

  let sum = 0;
  for (const [, v] of Object.entries(answersMap)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        const n = safeNum(item);
        if (n !== null) sum += n;
      }
    } else {
      const n = safeNum(v);
      if (n !== null) sum += n;
    }
  }
  return Number.isFinite(sum) ? sum : 0;
}

function formatNumber(n) {
  const x = Number(n) || 0;
  return x.toLocaleString();
}

function pct(part, total) {
  const p = total ? (Number(part) / Number(total)) * 100 : 0;
  if (!Number.isFinite(p)) return "0.00%";
  return `${p.toFixed(2)}%`;
}

// ------------------ simple SVG pie ------------------
function hslColor(i, total) {
  const hue = Math.round((i * 360) / Math.max(1, total));
  return `hsl(${hue} 70% 55%)`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function buildDistribution(pairs, limit = 8) {
  const sorted = [...pairs].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  if (sorted.length <= limit) return sorted;

  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  const others = tail.reduce((acc, x) => acc + (Number(x.value) || 0), 0);
  head.push({ label: "Others", value: others });
  return head;
}

/**
 * Responsive Pie:
 * - No fixed “side legend that forces overflow”
 * - Legend stacks under on small screens
 * - Card uses overflow-hidden so nothing bleeds out
 */
function PieChart({ data = [], size = 260 }) {
  const total = data.reduce((acc, d) => acc + (Number(d.value) || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  if (!total) return <div className="text-xs text-gray-500">No data</div>;

  let angle = 0;
  const slices = data.map((d, idx) => {
    const val = Number(d.value) || 0;
    const sliceAngle = (val / total) * 360;
    const start = angle;
    const end = angle + sliceAngle;
    angle = end;
    return { ...d, path: arcPath(cx, cy, r, start, end), color: hslColor(idx, data.length) };
  });

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 w-full">
        <div className="w-full sm:w-[55%] max-w-[340px] mx-auto sm:mx-0">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto block">
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1" />
            ))}
          </svg>
        </div>

        <div className="w-full sm:flex-1 text-xs text-gray-700 space-y-2 min-w-0">
          {slices.map((s, i) => {
            const p = total ? (Number(s.value) / total) * 100 : 0;
            return (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block h-3 w-3 rounded-sm shrink-0" style={{ background: s.color }} />
                  <span className="truncate" title={String(s.label)}>
                    {String(s.label)}
                  </span>
                </div>
                <div className="tabular-nums text-gray-600 shrink-0">
                  {Number.isFinite(p) ? `${p.toFixed(1)}%` : "0.0%"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------ simple SVG line chart ------------------
function LineChart({ labels = [], values = [], height = 220 }) {
  const w = 520;
  const h = height;
  const pad = 28;

  const maxV = Math.max(1, ...values.map((v) => Number(v) || 0));
  const minV = 0;

  const points = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
    const y = h - pad - ((Number(v) || 0) - minV) * ((h - pad * 2) / (maxV - minV));
    return { x, y };
  });

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[520px]">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />

        {Array.from({ length: 5 }).map((_, i) => {
          const t = i / 4;
          const y = pad + (h - pad * 2) * (1 - t);
          const val = Math.round(minV + (maxV - minV) * t);
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#f3f4f6" />
              <text x={6} y={y + 4} fontSize="10" fill="#6b7280">
                {val}
              </text>
            </g>
          );
        })}

        <path d={d} fill="none" stroke="#2563eb" strokeWidth="2.5" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#2563eb" strokeWidth="2" />
        ))}

        {labels.map((lab, i) => {
          const show = labels.length <= 10 ? true : i % 2 === 0 || i === labels.length - 1;
          if (!show) return null;
          const x = pad + (i * (w - pad * 2)) / Math.max(1, labels.length - 1);
          return (
            <text key={i} x={x} y={h - 10} fontSize="10" fill="#6b7280" textAnchor="middle">
              {lab}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ------------------ main page ------------------
export default function SummaryIndex() {
  // forms + years
  const [forms, setForms] = useState([]);
  const [years, setYears] = useState([]);
  const [year, setYear] = useState("");

  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);

  // computed stats
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // selected-year totals
  const [totalsByFormType, setTotalsByFormType] = useState({}); // {formTypeId: {label, total}}

  // ALL-years trend totals (yearly)
  const [yearlyTotals, setYearlyTotals] = useState({}); // {YYYY: total}

  // cache submission answers
  const answersCacheRef = useRef(new Map()); // submissionId => answersMap

  const enabledFormTypeIdsForYear = useMemo(() => {
    if (!year) return [];
    const ids = [];
    for (const f of Array.isArray(forms) ? forms : []) {
      const sc = schemaForYear(f, year);
      if (sc && String(sc.year) === String(year)) ids.push(String(f.id));
    }
    ids.sort((a, b) => Number(a) - Number(b));
    return ids;
  }, [forms, year]);

  function enabledFormTypeIdsForAnyYear(y) {
    const ids = [];
    for (const f of Array.isArray(forms) ? forms : []) {
      const sc = schemaForYear(f, y);
      if (sc && String(sc.year) === String(y)) ids.push(String(f.id));
    }
    ids.sort((a, b) => Number(a) - Number(b));
    return ids;
  }

  async function loadForms() {
    setFormsLoading(true);
    setFormsError(null);

    try {
      const res = await fetch(`/api/admin/forms?active=all`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const payload = await readJsonOrText(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

      const list = normalizeFormsList(payload);

      const yearSet = new Set();
      for (const f of list) {
        const versions = f?.schema_versions || f?.schemaVersions || [];
        for (const v of versions) {
          if (v?.year) yearSet.add(Number(v.year));
        }
      }
      const yrs = Array.from(yearSet).filter(Boolean).sort((a, b) => a - b);
      const defaultYear = yrs.length ? yrs[yrs.length - 1] : new Date().getFullYear();

      setForms(list);
      setYears(yrs);
      setYear((prev) => (prev ? prev : String(defaultYear)));
    } catch (e) {
      setForms([]);
      setYears([]);
      setFormsError(e?.message || "Failed to load forms");
    } finally {
      setFormsLoading(false);
    }
  }

  /**
   * Requirements:
   * - Pie + table: based on selected filter year
   * - Line chart: based on ALL years (yearly totals)
   */
  async function loadSummaryStats() {
    if (!year) return;

    setLoadingStats(true);
    setStatsError(null);

    try {
      // ---------- A) SELECTED YEAR: totals per form_type_id ----------
      const selectedYearSubmissions = []; // [{id, form_type_id}]
      const perFormType = {}; // formTypeId => {label, total}

      const concurrency = 6;
      const queue = [...enabledFormTypeIdsForYear];

      async function workerSelectedYear() {
        while (queue.length) {
          const formTypeId = queue.shift();
          if (!formTypeId) continue;

          const formRow = (forms || []).find((x) => String(x.id) === String(formTypeId));
          const label = formRow ? asFormLabel(formRow) : `Form #${formTypeId}`;
          if (!perFormType[String(formTypeId)]) perFormType[String(formTypeId)] = { label, total: 0 };

          const params = new URLSearchParams();
          params.set("year", String(year));
          params.set("status", "submitted");
          params.set("form_type_id", String(formTypeId));
          params.set("per_page", "200");

          const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
            headers: { Accept: "application/json" },
            credentials: "same-origin",
          });

          const payload = await readJsonOrText(res);
          if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

          const rows = extractRows(payload);
          for (const r of rows) {
            if (!r?.id) continue;
            selectedYearSubmissions.push({ id: r.id, form_type_id: String(formTypeId) });
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => workerSelectedYear())
      );

      const idsQueue = selectedYearSubmissions.map((s) => s.id);
      const max2 = 6;

      async function workerSelectedYearCompute() {
        while (idsQueue.length) {
          const subId = idsQueue.shift();
          if (!subId) continue;

          let answersMap = answersCacheRef.current.get(String(subId));
          if (!answersMap) {
            const res = await fetch(`/api/admin/submissions/${subId}`, {
              headers: { Accept: "application/json" },
              credentials: "same-origin",
            });
            const payload = await readJsonOrText(res);
            if (!res.ok) throw new Error(payload?.message || `Failed to load submission #${subId}`);

            answersMap = buildAnswersMapFromPayload(payload);
            answersCacheRef.current.set(String(subId), answersMap);
          }

          const row = selectedYearSubmissions.find((x) => String(x.id) === String(subId));
          if (!row) continue;

          const emission = computeEmissionFromAnswers(answersMap);
          const ft = String(row.form_type_id);
          if (!perFormType[ft]) perFormType[ft] = { label: `Form #${ft}`, total: 0 };
          perFormType[ft].total += Number(emission) || 0;
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(max2, selectedYearSubmissions.length || 1) }, () => workerSelectedYearCompute())
      );

      // ---------- B) ALL YEARS: yearly totals (for line chart) ----------
      // We compute totals per year across forms that have schema_versions for that year.
      // Note: This can be heavy; caching submission answers reduces repeat work.
      const allYearTotals = {}; // {YYYY: total}

      const yearsToCompute = (years || []).map((y) => String(y)).filter(Boolean);
      const yearQueue = [...yearsToCompute];
      const maxYearWorkers = 3;

      async function workerAllYears() {
        while (yearQueue.length) {
          const y = yearQueue.shift();
          if (!y) continue;

          const formIds = enabledFormTypeIdsForAnyYear(y);
          if (!formIds.length) {
            allYearTotals[String(y)] = 0;
            continue;
          }

          // gather all submission IDs for this year across eligible forms
          const subs = [];
          const formQueue = [...formIds];

          async function workerFormsForYear() {
            while (formQueue.length) {
              const formTypeId = formQueue.shift();
              if (!formTypeId) continue;

              const params = new URLSearchParams();
              params.set("year", String(y));
              params.set("status", "submitted");
              params.set("form_type_id", String(formTypeId));
              params.set("per_page", "200");

              const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
              });

              const payload = await readJsonOrText(res);
              if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

              const rows = extractRows(payload);
              for (const r of rows) {
                if (!r?.id) continue;
                subs.push(r.id);
              }
            }
          }

          // limit concurrent per-year form fetches
          await Promise.all(Array.from({ length: Math.min(3, formQueue.length || 1) }, () => workerFormsForYear()));

          // compute total emissions for this year
          let total = 0;
          const subQueue = [...subs];

          async function workerSubsForYear() {
            while (subQueue.length) {
              const subId = subQueue.shift();
              if (!subId) continue;

              let answersMap = answersCacheRef.current.get(String(subId));
              if (!answersMap) {
                const res = await fetch(`/api/admin/submissions/${subId}`, {
                  headers: { Accept: "application/json" },
                  credentials: "same-origin",
                });
                const payload = await readJsonOrText(res);
                if (!res.ok) throw new Error(payload?.message || `Failed to load submission #${subId}`);

                answersMap = buildAnswersMapFromPayload(payload);
                answersCacheRef.current.set(String(subId), answersMap);
              }

              total += Number(computeEmissionFromAnswers(answersMap)) || 0;
            }
          }

          await Promise.all(Array.from({ length: Math.min(4, subs.length || 1) }, () => workerSubsForYear()));

          allYearTotals[String(y)] = total;
        }
      }

      await Promise.all(Array.from({ length: Math.min(maxYearWorkers, yearQueue.length || 1) }, () => workerAllYears()));

      setTotalsByFormType(perFormType);
      setYearlyTotals(allYearTotals);
    } catch (e) {
      setTotalsByFormType({});
      setYearlyTotals({});
      setStatsError(e?.message || "Failed to compute summary stats");
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!forms.length || !year) return;
    loadSummaryStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, forms.length]);

  // ---- derived view models (selected year) ----
  const rowsForTable = useMemo(() => {
    const entries = Object.entries(totalsByFormType || {})
      .map(([formTypeId, obj]) => ({
        formTypeId,
        label: obj?.label ?? `Form #${formTypeId}`,
        emissions: Number(obj?.total) || 0,
      }))
      .filter((x) => x.emissions > 0 || x.label);

    entries.sort((a, b) => Number(a.formTypeId) - Number(b.formTypeId));
    return entries;
  }, [totalsByFormType]);

  const totalEmissions = useMemo(
    () => rowsForTable.reduce((acc, r) => acc + (Number(r.emissions) || 0), 0),
    [rowsForTable]
  );

  const pieData = useMemo(() => {
    const pairs = rowsForTable.map((r) => ({ label: r.label, value: r.emissions }));
    return buildDistribution(pairs, 8);
  }, [rowsForTable]);

  // ---- derived view models (ALL years for trend line) ----
  const yearLine = useMemo(() => {
    const ys = (years || []).map((y) => String(y)).filter(Boolean).sort((a, b) => Number(a) - Number(b));
    const vals = ys.map((y) => Number(yearlyTotals?.[String(y)] || 0));
    return { labels: ys, values: vals };
  }, [years, yearlyTotals]);

  return (
    <AuthenticatedLayout title="GHG Summary">
      <PageHeader
        title="GHG Emission Summary"
        subtitle={`This page summarizes computed emissions for year ${year || "—"} based on submitted forms. Computation follows the same rules as the Map module.`}
      />

      <div className="px-6 pb-8 space-y-4">
        {/* controls */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Select Year</label>
            <select
              className="border rounded px-3 py-2 text-sm bg-white"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={formsLoading || !years.length}
            >
              {years.length ? (
                years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))
              ) : (
                <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
              )}
            </select>
          </div>

          <div className="text-xs text-gray-500">
            {formsLoading ? "Loading forms…" : null}
            {loadingStats ? " Computing…" : null}
            {!loadingStats && (formsError || statsError) ? (
              <span className="text-red-600 ml-2">{formsError || statsError}</span>
            ) : null}
          </div>
        </div>

        {/* empty */}
        {!formsLoading && !loadingStats && year && enabledFormTypeIdsForYear.length === 0 ? (
          <EmptyState
            title="No forms for this year"
            description={`No schema_versions matched year ${year}. Add schema versions or select another year.`}
          />
        ) : null}

        {/* top table card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <div className="text-sm text-gray-700">
              Totals below are computed by summing numeric emission values from each submitted form response (same as Map).
            </div>
          </div>

          <div className="p-4 overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 px-3 border-b">Hierarchy (by form_type_id)</th>
                  <th className="py-2 px-3 border-b">Description</th>
                  <th className="py-2 px-3 border-b text-right">Emissions (computed)</th>
                  <th className="py-2 px-3 border-b text-right">Proportion</th>
                </tr>
              </thead>
              <tbody>
                {rowsForTable.length ? (
                  rowsForTable.map((r) => (
                    <tr key={r.formTypeId} className="text-gray-800">
                      <td className="py-2 px-3 border-b">
                        <div className="font-semibold">{`#${r.formTypeId}`}</div>
                      </td>
                      <td className="py-2 px-3 border-b">
                        <div className="text-gray-700">{r.label}</div>
                        <div className="text-xs text-gray-500">Form type</div>
                      </td>
                      <td className="py-2 px-3 border-b text-right tabular-nums">{formatNumber(r.emissions)}</td>
                      <td className="py-2 px-3 border-b text-right tabular-nums">{pct(r.emissions, totalEmissions)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 px-3 text-gray-600">
                      {loadingStats ? "Computing…" : "No computed totals yet (needs submitted submissions)."}
                    </td>
                  </tr>
                )}

                <tr className="font-semibold">
                  <td className="py-2 px-3" colSpan={2}>
                    Total emissions
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatNumber(totalEmissions)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-hidden">
            <div className="tracking-[0.25em] text-xs font-semibold text-gray-700">EMISSION TRENDS</div>
            <div className="text-xs text-gray-500 mt-1">
              Yearly total emissions across all years (computed from submissions).
            </div>

            <div className="mt-3">
              <LineChart labels={yearLine.labels} values={yearLine.values} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-hidden">
            <div className="tracking-[0.25em] text-xs font-semibold text-gray-700 text-center">EMISSION BY FORM TYPE</div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              Top form types by computed emissions (selected year: {year || "—"}).
            </div>

            <div className="mt-4 flex justify-center">
              <div className="w-full max-w-[640px]">
                <PieChart data={pieData} size={260} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
