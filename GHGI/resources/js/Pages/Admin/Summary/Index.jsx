// resources/js/Pages/Admin/Summary/Index.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import EmptyState from "../../../Components/Shared/EmptyState";

import LineChart from "../../../Components/Admin/Summary/LineChart";
import PieChart from "../../../Components/Admin/Summary/PieChart";
import SummaryTable from "../../../Components/Admin/Summary/SummaryTable";

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

function buildDistribution(pairs, limit = 8) {
  const sorted = [...pairs].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  if (sorted.length <= limit) return sorted;

  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  const others = tail.reduce((acc, x) => acc + (Number(x.value) || 0), 0);
  head.push({ label: "Others", value: others });
  return head;
}

// ------------------ main page ------------------
export default function SummaryIndex() {
  // forms + years
  const [forms, setForms] = useState([]);
  const [years, setYears] = useState([]);

  // “pending” year typed/selected in UI (does NOT compute table/pie)
  const [yearDraft, setYearDraft] = useState("");

  // “applied” year (ONLY when user clicks Apply; triggers heavy compute)
  const [yearApplied, setYearApplied] = useState("");

  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);

  // trend line (ALL years) loading/error
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendError, setTrendError] = useState(null);

  // selected-year stats loading/error (table + pie)
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [selectedError, setSelectedError] = useState(null);

  // selected-year totals
  const [totalsByFormType, setTotalsByFormType] = useState({}); // {formTypeId: {label, total}}

  // ALL-years trend totals (yearly)
  const [yearlyTotals, setYearlyTotals] = useState({}); // {YYYY: total}

  // caches
  const answersCacheRef = useRef(new Map()); // submissionId => answersMap
  const yearlyTotalsCacheRef = useRef(null); // store computed trend once per load

  const enabledFormTypeIdsForYearApplied = useMemo(() => {
    if (!yearApplied) return [];
    const ids = [];
    for (const f of Array.isArray(forms) ? forms : []) {
      const sc = schemaForYear(f, yearApplied);
      if (sc && String(sc.year) === String(yearApplied)) ids.push(String(f.id));
    }
    ids.sort((a, b) => Number(a) - Number(b));
    return ids;
  }, [forms, yearApplied]);

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

      setForms(list);
      setYears(yrs);

      // do NOT auto-compute table/pie; draft defaults to latest year for convenience only
      const latest = yrs.length ? String(yrs[yrs.length - 1]) : "";
      setYearDraft((prev) => prev || latest);
      setYearApplied(""); // force user to click Apply
    } catch (e) {
      setForms([]);
      setYears([]);
      setFormsError(e?.message || "Failed to load forms");
      setYearDraft("");
      setYearApplied("");
    } finally {
      setFormsLoading(false);
    }
  }

  /**
   * Trend line (ALL years) — compute immediately (lightest visible metric),
   * cache it so it doesn't recompute on year changes.
   */
  async function loadTrendLineAllYears() {
    if (!years?.length || !forms?.length) return;

    // reuse cache if already computed
    if (yearlyTotalsCacheRef.current && typeof yearlyTotalsCacheRef.current === "object") {
      setYearlyTotals(yearlyTotalsCacheRef.current);
      return;
    }

    setLoadingTrend(true);
    setTrendError(null);

    try {
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

          await Promise.all(Array.from({ length: Math.min(3, formQueue.length || 1) }, () => workerFormsForYear()));

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

      yearlyTotalsCacheRef.current = allYearTotals;
      setYearlyTotals(allYearTotals);
    } catch (e) {
      setYearlyTotals({});
      yearlyTotalsCacheRef.current = null;
      setTrendError(e?.message || "Failed to compute trend line totals");
    } finally {
      setLoadingTrend(false);
    }
  }

  /**
   * Selected year (table + pie) — ONLY runs after Apply is clicked.
   */
  async function loadSelectedYearStats(appliedYear) {
    if (!appliedYear) return;

    setLoadingSelected(true);
    setSelectedError(null);

    try {
      const selectedYearSubmissions = []; // [{id, form_type_id}]
      const perFormType = {}; // formTypeId => {label, total}

      const enabled = [];
      for (const f of Array.isArray(forms) ? forms : []) {
        const sc = schemaForYear(f, appliedYear);
        if (sc && String(sc.year) === String(appliedYear)) enabled.push(String(f.id));
      }
      enabled.sort((a, b) => Number(a) - Number(b));

      if (!enabled.length) {
        setTotalsByFormType({});
        return;
      }

      const concurrency = 6;
      const queue = [...enabled];

      async function workerSelectedYearList() {
        while (queue.length) {
          const formTypeId = queue.shift();
          if (!formTypeId) continue;

          const formRow = (forms || []).find((x) => String(x.id) === String(formTypeId));
          const label = formRow ? asFormLabel(formRow) : `Form #${formTypeId}`;
          if (!perFormType[String(formTypeId)]) perFormType[String(formTypeId)] = { label, total: 0 };

          const params = new URLSearchParams();
          params.set("year", String(appliedYear));
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
        Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => workerSelectedYearList())
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

      setTotalsByFormType(perFormType);
    } catch (e) {
      setTotalsByFormType({});
      setSelectedError(e?.message || "Failed to compute selected-year totals");
    } finally {
      setLoadingSelected(false);
    }
  }

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // compute ONLY the trend line after forms/years become available
  useEffect(() => {
    if (!forms.length || !years.length) return;
    loadTrendLineAllYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms.length, years.length]);

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

  // ---- year selection UX helpers ----
  const yearsDesc = useMemo(() => {
    const ys = (years || []).map((y) => String(y)).filter(Boolean);
    ys.sort((a, b) => Number(b) - Number(a));
    return ys;
  }, [years]);

  const yearDraftIsValid = useMemo(() => {
    if (!yearDraft) return false;
    return yearsDesc.includes(String(yearDraft));
  }, [yearDraft, yearsDesc]);

  function applyYear() {
    if (!yearDraftIsValid) return;
    const y = String(yearDraft);
    setYearApplied(y);
    loadSelectedYearStats(y);
  }

  function clearYear() {
    setYearApplied("");
    setTotalsByFormType({});
    setSelectedError(null);
  }

  const anyError = formsError || trendError || selectedError;

  return (
    <AuthenticatedLayout title="GHG Summary">
      <PageHeader
        title="GHG Emission Summary"
        subtitle={
          yearApplied
            ? `Table/Pie computed for year ${yearApplied}. Line chart shows yearly totals across all years (same emission rules as Map).`
            : "Select a year then click Apply to compute the table and pie. Line chart shows yearly totals across all years (same emission rules as Map)."
        }
      />

      <div className="px-6 pb-8 space-y-4">
        {/* controls */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[260px]">
            <label className="block text-xs text-gray-600 mb-1">Year (searchable)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  className={`w-full border rounded-xl px-3 py-2 text-sm bg-white pr-10 ${
                    yearDraft && !yearDraftIsValid ? "border-red-300" : "border-gray-300"
                  }`}
                  list="years_datalist"
                  inputMode="numeric"
                  placeholder={yearsDesc.length ? "Type or select (e.g., 2025)" : "No years found"}
                  value={yearDraft}
                  onChange={(e) => setYearDraft(e.target.value)}
                  disabled={formsLoading || !yearsDesc.length}
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  ⌄
                </div>
                <datalist id="years_datalist">
                  {yearsDesc.map((y) => (
                    <option key={y} value={y} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                onClick={applyYear}
                disabled={formsLoading || !yearsDesc.length || !yearDraftIsValid || loadingSelected}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                  formsLoading || !yearsDesc.length || !yearDraftIsValid || loadingSelected
                    ? "bg-gray-50 text-gray-400"
                    : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                }`}
              >
                Apply
              </button>

              <button
                type="button"
                onClick={clearYear}
                disabled={!yearApplied || loadingSelected}
                className={`px-3 py-2 rounded-xl text-sm border ${
                  !yearApplied || loadingSelected ? "bg-gray-50 text-gray-400" : "bg-white hover:bg-gray-50"
                }`}
              >
                Clear
              </button>
            </div>

            {yearDraft && !yearDraftIsValid ? (
              <div className="mt-1 text-xs text-red-600">Pick a year from the available list.</div>
            ) : null}

            {yearApplied ? (
              <div className="mt-1 text-xs text-gray-500">
                Applied: <span className="font-semibold text-gray-700">{yearApplied}</span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-gray-500">Not applied yet (no heavy compute).</div>
            )}
          </div>

          <div className="text-xs text-gray-500">
            {formsLoading ? "Loading forms…" : null}
            {loadingTrend ? " Computing trend…" : null}
            {loadingSelected ? " Computing table/pie…" : null}
            {!formsLoading && !loadingTrend && !loadingSelected && anyError ? (
              <span className="text-red-600 ml-2">{anyError}</span>
            ) : null}
          </div>
        </div>

        {/* table card (componentized) */}
        <SummaryTable
          yearApplied={yearApplied}
          enabledFormTypeIdsForYearApplied={enabledFormTypeIdsForYearApplied}
          rowsForTable={rowsForTable}
          totalEmissions={totalEmissions}
          loadingSelected={loadingSelected}
        />

        {/* charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-hidden">
            <div className="tracking-[0.25em] text-xs font-semibold text-gray-700">EMISSION TRENDS</div>
            <div className="text-xs text-gray-500 mt-1">
              Yearly total emissions across all years (computed from submissions).
            </div>
            {trendError ? <div className="mt-2 text-xs text-red-600">{trendError}</div> : null}
            <div className="mt-3">{loadingTrend ? <div className="text-xs text-gray-500">Computing…</div> : null}</div>
            <div className="mt-3">
            <LineChart labels={yearLine.labels} values={yearLine.values} loading={loadingTrend} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-hidden">
            <div className="tracking-[0.25em] text-xs font-semibold text-gray-700 text-center">EMISSION BY FORM TYPE</div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              Top form types by computed emissions{yearApplied ? ` (selected year: ${yearApplied}).` : " (select a year and Apply)."}
            </div>

            <div className="mt-4 flex justify-center">
              <div className="w-full max-w-[640px]">
                {!yearApplied ? (
                  <div className="text-xs text-gray-500 text-center py-8">No year applied.</div>
                ) : (
                  <PieChart data={pieData} size={260} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* keep EmptyState import used (table component uses it too, but ok) */}
        {!formsLoading && !loadingSelected && yearApplied && enabledFormTypeIdsForYearApplied.length === 0 ? (
          <EmptyState
            title="No forms for this year"
            description={`No schema_versions matched year ${yearApplied}. Add schema versions or select another year.`}
          />
        ) : null}
      </div>
    </AuthenticatedLayout>
  );
}
