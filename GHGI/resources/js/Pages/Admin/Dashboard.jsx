// resources/js/Pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "../../Layouts/AuthenticatedLayout";
import StatCard from "../../Components/Shared/StatCard";

// If Vite ever complains about JSON import, switch to:
// import lgusUrl from "../Admin/Map/laguna_barangays_list.json?url" and fetch it.
// For most Vite setups, JSON import is fine.
import lagunaBarangaysList from "../Admin/Map/laguna_barangays_list.json";

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

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
    if (typeof c === "object" && Array.isArray(c.data)) return c.data; // paginator-like
    if (typeof c === "object" && c.rows && Array.isArray(c.rows.data)) return c.rows.data;
  }
  return [];
}

function getPaginatorMeta(payload) {
  // Laravel paginator typical shapes:
  // payload = { data: { rows: { current_page, last_page, data: [...] } } } OR { data: { current_page,... } }
  const cand = payload?.data?.rows ?? payload?.rows ?? payload?.data ?? payload ?? null;
  if (!cand || typeof cand !== "object") return null;

  const obj = cand?.data && Array.isArray(cand.data) ? cand : null;
  if (obj && (obj.current_page || obj.last_page)) {
    return { current_page: Number(obj.current_page || 1), last_page: Number(obj.last_page || 1) };
  }

  const rows = cand?.rows;
  if (rows && typeof rows === "object" && Array.isArray(rows.data) && (rows.current_page || rows.last_page)) {
    return { current_page: Number(rows.current_page || 1), last_page: Number(rows.last_page || 1) };
  }

  return null;
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

function computeEmissionFromAnswers(answersMap) {
  if (!answersMap || typeof answersMap !== "object") return 0;

  // Prefer explicit CO2e / GHG emission fields if present
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

  // Fallback: sum numeric fields (heuristic)
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

function getTotalLgusFromBarangaysList(json) {
  // Goal: count unique municipalities/cities (LGUs) in Laguna.
  // Supports multiple possible field names.
  const list = Array.isArray(json) ? json : json?.data ?? json?.barangays ?? [];
  const set = new Set();

  for (const r of Array.isArray(list) ? list : []) {
    const city =
      r?.city_name ??
      r?.city ??
      r?.municipality ??
      r?.mun_name ??
      r?.lgu ??
      r?.lgu_name ??
      null;

    if (city) set.add(String(city).trim());
  }

  return set.size || 0;
}

export default function Dashboard() {
  const csrf = useMemo(() => getCsrfToken(), []);

  const [latestYear, setLatestYear] = useState(null);
  const [totalLgus, setTotalLgus] = useState(() => getTotalLgusFromBarangaysList(lagunaBarangaysList));
  const [totalEmissions, setTotalEmissions] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const answersCacheRef = useRef(new Map()); // submissionId => answersMap

  async function loadLatestYearFromForms() {
    const res = await fetch(`/api/admin/forms?active=all`, {
      headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
      credentials: "same-origin",
    });

    const payload = await readJsonOrText(res);
    if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

    const forms = normalizeFormsList(payload);

    const yearSet = new Set();
    for (const f of forms) {
      const versions = f?.schema_versions || f?.schemaVersions || [];
      for (const v of versions) {
        if (v?.year) yearSet.add(Number(v.year));
      }
    }

    const years = Array.from(yearSet).filter(Boolean).sort((a, b) => a - b);
    return years.length ? years[years.length - 1] : new Date().getFullYear();
  }

  async function fetchAllSubmissionsForYear(y) {
    const all = [];
    let page = 1;
    let last = 1;

    while (page <= last) {
      const params = new URLSearchParams();
      params.set("year", String(y));
      params.set("status", "submitted");
      params.set("per_page", "200");
      params.set("page", String(page));

      const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
        headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
        credentials: "same-origin",
      });

      const payload = await readJsonOrText(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

      const rows = extractRows(payload);
      for (const r of rows) {
        if (r?.id) all.push({ id: r.id });
      }

      const meta = getPaginatorMeta(payload);
      if (meta) {
        last = meta.last_page || 1;
      } else {
        // Non-paginated response
        last = 1;
      }

      page += 1;
    }

    return all;
  }

  async function fetchSubmissionAnswersMap(subId) {
    const key = String(subId);
    const cached = answersCacheRef.current.get(key);
    if (cached) return cached;

    const res = await fetch(`/api/admin/submissions/${subId}`, {
      headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
      credentials: "same-origin",
    });

    const payload = await readJsonOrText(res);
    if (!res.ok) throw new Error(payload?.message || `Failed to load submission #${subId}`);

    const map = buildAnswersMapFromPayload(payload);
    answersCacheRef.current.set(key, map);
    return map;
  }

  async function computeTotalEmissionsForYear(y) {
    const subs = await fetchAllSubmissionsForYear(y);
    if (!subs.length) return 0;

    let total = 0;
    const queue = subs.map((s) => s.id);
    const concurrency = 8;

    async function worker() {
      while (queue.length) {
        const id = queue.shift();
        if (!id) continue;
        const answersMap = await fetchSubmissionAnswersMap(id);
        total += computeEmissionFromAnswers(answersMap);
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, subs.length) }, () => worker()));
    return total;
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        // LGUs: from local JSON file
        setTotalLgus(getTotalLgusFromBarangaysList(lagunaBarangaysList));

        // Latest year: ONLY from FormSchemaVersions/FormMapping exposure via /api/admin/forms
        const y = await loadLatestYearFromForms();
        if (cancelled) return;
        setLatestYear(y);

        // Total emissions: computed from submissions + answers for that year
        const total = await computeTotalEmissionsForYear(y);
        if (cancelled) return;
        setTotalEmissions(total);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load dashboard stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestYearDisplay = latestYear ?? (loading ? "…" : "—");
  const totalLgusDisplay = totalLgus ?? (loading ? "…" : "—");
  const totalEmissionsDisplay = loading && !totalEmissions ? "…" : Number(totalEmissions || 0).toLocaleString();

  return (
    <AuthenticatedLayout title="Dashboard">
      {err ? <div className="mb-4 text-sm text-red-600">{err}</div> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard
          label="LATEST INVENTORY YEAR"
          value={latestYearDisplay}
          hint={
            latestYear
              ? `All summaries and visuals are currently showing data for ${latestYear}.`
              : "Loading inventory year…"
          }
        />

        <StatCard
          label="TOTAL EMISSIONS"
          value={totalEmissionsDisplay}
          suffix="tCO₂e"
          hint={
            latestYear
              ? `Computed from submitted submissions (year ${latestYear}) by aggregating emissions from answers.`
              : "Computing emissions…"
          }
        />
      </div>
    </AuthenticatedLayout>
  );
}
