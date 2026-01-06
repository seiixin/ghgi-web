// resources/js/Pages/Admin/Map/Index.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// IMPORTANT: Vite fix for .geojson
import lagunaGeoUrl from "./laguna_boundaries.geojson?url";

/**
 * PURE LEAFLET VERSION (no react-leaflet dependency)
 * - Years list comes ONLY from schema_versions in /api/admin/forms?active=all
 * - Layers list driven by FormTypes (forms endpoint)
 * - Data driven by /api/admin/submissions + /api/admin/submissions/{id} (answers)
 * - NO POINTS: polygon choropleth + surveyed overlay
 */

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

function toLabel(x) {
  return String(x || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

function quantileClassByValue(valuesByKey) {
  const entries = Object.entries(valuesByKey).filter(([, v]) => Number(v) > 0);
  if (!entries.length) return {};

  const sortedVals = entries.map(([, v]) => Number(v)).sort((a, b) => a - b);
  const q33 = sortedVals[Math.floor((sortedVals.length - 1) * 0.33)] ?? 0;
  const q66 = sortedVals[Math.floor((sortedVals.length - 1) * 0.66)] ?? 0;

  const out = {};
  for (const [k, vRaw] of entries) {
    const v = Number(vRaw) || 0;
    if (v <= q33) out[k] = "low";
    else if (v <= q66) out[k] = "medium";
    else out[k] = "high";
  }
  return out;
}

function levelColor(level) {
  if (level === "high") return "#ef4444";
  if (level === "medium") return "#f59e0b";
  if (level === "low") return "#22c55e";
  return "#e5e7eb";
}

function surveyedFillColor(isSurveyed) {
  return isSurveyed ? "#22c55e" : "#ef4444";
}

function cityListFromGeojson(fc) {
  const names = new Set();
  for (const f of fc?.features || []) {
    const n = f?.properties?.city_name;
    if (n) names.add(String(n));
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function groupForms(forms, year) {
  const groups = new Map();

  for (const f of Array.isArray(forms) ? forms : []) {
    const schema = schemaForYear(f, year);
    if (!schema || String(schema.year) !== String(year)) continue;

    const sector =
      f?.sector_key ||
      schema?.ui_json?.meta?.sector ||
      schema?.uiJson?.meta?.sector ||
      "Other";

    if (!groups.has(sector)) groups.set(sector, []);
    groups.get(sector).push(f);
  }

  const out = Array.from(groups.entries()).map(([sector, items]) => {
    items.sort((a, b) => asFormLabel(a).localeCompare(asFormLabel(b)));
    return { sector, items };
  });
  out.sort((a, b) => String(a.sector).localeCompare(String(b.sector)));
  return out;
}

function Legend({ mode }) {
  return (
    <div className="border rounded-lg bg-white p-3">
      <div className="text-sm font-semibold text-gray-900">
        {mode === "emission" ? "Emission Index (per municipality)" : "Survey Area"}
      </div>
      <div className="mt-2 space-y-2 text-sm">
        {mode === "emission" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: levelColor("low") }} />
              <span className="text-gray-700">Low relative emissions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: levelColor("medium") }} />
              <span className="text-gray-700">Medium relative emissions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: levelColor("high") }} />
              <span className="text-gray-700">High relative emissions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: levelColor(null) }} />
              <span className="text-gray-700">No data</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: surveyedFillColor(true) }} />
              <span className="text-gray-700">Surveyed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: surveyedFillColor(false) }} />
              <span className="text-gray-700">Unsurveyed</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MapIndex() {
  const csrf = useMemo(() => getCsrfToken(), []);

  // GeoJSON now loaded via fetch
  const [lagunaBoundaries, setLagunaBoundaries] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // UI state
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState(null);

  const [years, setYears] = useState([]);
  const [year, setYear] = useState("");

  const allCities = useMemo(() => cityListFromGeojson(lagunaBoundaries), [lagunaBoundaries]);
  const [city, setCity] = useState("__ALL__");

  const [enabledFormIds, setEnabledFormIds] = useState(new Set());
  const [showSurveyLayer, setShowSurveyLayer] = useState(true);
  const [showEmissionLayer, setShowEmissionLayer] = useState(true);

  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const [cityCounts, setCityCounts] = useState({});
  const [cityEmissions, setCityEmissions] = useState({});
  const [cityLevels, setCityLevels] = useState({});
  const [selectedCityOnMap, setSelectedCityOnMap] = useState(null);

  // Leaflet refs
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const baseLayerRef = useRef(null);
  const emissionLayerRef = useRef(null);
  const surveyLayerRef = useRef(null);

  // cache answers
  const answersCacheRef = useRef(new Map()); // submissionId => answersMap

  const enabledFormIdsArray = useMemo(() => Array.from(enabledFormIds), [enabledFormIds]);
  const formGroups = useMemo(() => groupForms(forms, year), [forms, year]);

  const activeCity = selectedCityOnMap || (city !== "__ALL__" ? city : null);

  const rightPanel = useMemo(() => {
    if (!activeCity) {
      const allEmission = Object.values(cityEmissions).reduce((a, b) => a + (Number(b) || 0), 0);
      const allCount = Object.values(cityCounts).reduce((a, b) => a + (Number(b) || 0), 0);
      return { title: "All Municipalities", submissions: allCount, emissions: allEmission, level: null };
    }
    return {
      title: activeCity,
      submissions: cityCounts[activeCity] || 0,
      emissions: cityEmissions[activeCity] || 0,
      level: cityLevels[activeCity] || null,
    };
  }, [activeCity, cityCounts, cityEmissions, cityLevels]);

  async function loadGeojson() {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const res = await fetch(lagunaGeoUrl, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Failed to load GeoJSON");
      const json = await res.json();
      setLagunaBoundaries(json);
    } catch (e) {
      setLagunaBoundaries(null);
      setGeoError(e?.message || "Failed to load GeoJSON");
    } finally {
      setGeoLoading(false);
    }
  }

  async function loadForms() {
    setFormsLoading(true);
    setFormsError(null);

    try {
      const res = await fetch(`/api/admin/forms?active=all`, {
        headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
        credentials: "same-origin",
      });

      const payload = await readJsonOrText(res);
      if (!res.ok) throw new Error(payload?.message || "Failed to load forms");

      const list = normalizeFormsList(payload);

      // Years only from schema_versions
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

      // enable all forms that have schema for defaultYear
      const enabled = new Set();
      for (const f of list) {
        const sc = schemaForYear(f, defaultYear);
        if (sc && String(sc.year) === String(defaultYear)) enabled.add(String(f.id));
      }
      setEnabledFormIds(enabled);
    } catch (e) {
      setForms([]);
      setYears([]);
      setFormsError(e?.message || "Failed to load forms");
    } finally {
      setFormsLoading(false);
    }
  }

  useEffect(() => {
    loadGeojson();
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!year || !forms.length) return;

    const enabled = new Set();
    for (const f of forms) {
      const sc = schemaForYear(f, year);
      if (sc && String(sc.year) === String(year)) enabled.add(String(f.id));
    }
    setEnabledFormIds(enabled);
    setSelectedCityOnMap(null);
  }, [year, forms]);

  function toggleFormId(id) {
    setEnabledFormIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setAllForms(enabled) {
    setEnabledFormIds(() => {
      const next = new Set();
      if (enabled) {
        for (const f of forms) {
          const sc = schemaForYear(f, year);
          if (sc && String(sc.year) === String(year)) next.add(String(f.id));
        }
      }
      return next;
    });
  }

  async function loadStats() {
    if (!year) return;

    setLoadingStats(true);
    setStatsError(null);

    try {
      const results = [];
      const concurrency = 6;
      const queue = [...enabledFormIdsArray];

      async function worker() {
        while (queue.length) {
          const formTypeId = queue.shift();
          if (!formTypeId) continue;

          const params = new URLSearchParams();
          params.set("year", String(year));
          params.set("status", "submitted");
          params.set("form_type_id", String(formTypeId));
          params.set("per_page", "200");

          const res = await fetch(`/api/admin/submissions?${params.toString()}`, {
            headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
            credentials: "same-origin",
          });

          const payload = await readJsonOrText(res);
          if (!res.ok) throw new Error(payload?.message || "Failed to load submissions");

          const rows = extractRows(payload);
          for (const r of rows) {
            if (!r?.id) continue;
            results.push({
              id: r.id,
              city_name: r.city_name ?? r.cityName ?? null,
            });
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(concurrency, enabledFormIdsArray.length || 1) }, () => worker())
      );

      const filtered = results.filter((s) => {
        if (!s?.city_name) return false;
        if (city === "__ALL__") return true;
        return String(s.city_name).toLowerCase() === String(city).toLowerCase();
      });

      const counts = {};
      const emissions = {};

      const idsQueue = filtered.map((x) => x.id);
      const max2 = 6;

      async function worker2() {
        while (idsQueue.length) {
          const subId = idsQueue.shift();
          if (!subId) continue;

          let answersMap = answersCacheRef.current.get(String(subId));
          if (!answersMap) {
            const res = await fetch(`/api/admin/submissions/${subId}`, {
              headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
              credentials: "same-origin",
            });

            const payload = await readJsonOrText(res);
            if (!res.ok) throw new Error(payload?.message || `Failed to load submission #${subId}`);

            answersMap = buildAnswersMapFromPayload(payload);
            answersCacheRef.current.set(String(subId), answersMap);
          }

          const row = filtered.find((x) => String(x.id) === String(subId));
          const cName = row?.city_name ? String(row.city_name) : null;
          if (!cName) continue;

          counts[cName] = (counts[cName] || 0) + 1;
          const emission = computeEmissionFromAnswers(answersMap);
          emissions[cName] = (emissions[cName] || 0) + (Number(emission) || 0);
        }
      }

      await Promise.all(Array.from({ length: Math.min(max2, filtered.length || 1) }, () => worker2()));

      const levels = quantileClassByValue(emissions);

      setCityCounts(counts);
      setCityEmissions(emissions);
      setCityLevels(levels);
    } catch (e) {
      setCityCounts({});
      setCityEmissions({});
      setCityLevels({});
      setStatsError(e?.message || "Failed to compute map stats");
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, city, enabledFormIdsArray.join("|")]);

  // Leaflet init (wait for GeoJSON)
  useEffect(() => {
    if (!mapDivRef.current) return;
    if (mapRef.current) return;
    if (!lagunaBoundaries) return;

    const map = L.map(mapDivRef.current, {
      center: [14.21, 121.33],
      zoom: 10,
      zoomControl: true,
    });

    const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    });

    tile.addTo(map);
    baseLayerRef.current = tile;
    mapRef.current = map;

    try {
      const bounds = L.geoJSON(lagunaBoundaries).getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch {
      // ignore
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lagunaBoundaries]);

  function fitToSelectedCity(map, cityName) {
    if (!lagunaBoundaries) return;

    try {
      if (!cityName || cityName === "__ALL__") {
        const bounds = L.geoJSON(lagunaBoundaries).getBounds();
        if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        return;
      }
      const filtered = {
        ...lagunaBoundaries,
        features: (lagunaBoundaries.features || []).filter(
          (f) => String(f?.properties?.city_name || "").toLowerCase() === String(cityName).toLowerCase()
        ),
      };
      const bounds = L.geoJSON(filtered).getBounds();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch {
      // ignore
    }
  }

  // rebuild layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lagunaBoundaries) return;

    if (emissionLayerRef.current) {
      emissionLayerRef.current.removeFrom(map);
      emissionLayerRef.current = null;
    }
    if (surveyLayerRef.current) {
      surveyLayerRef.current.removeFrom(map);
      surveyLayerRef.current = null;
    }

    const onEach = (feature, layer) => {
      const cityName = feature?.properties?.city_name ? String(feature.properties.city_name) : "";
      const count = cityCounts[cityName] || 0;
      const emission = cityEmissions[cityName] || 0;
      const level = cityLevels[cityName] || null;

      const html = `
        <div style="min-width: 220px">
          <div style="font-weight: 700; margin-bottom: 6px;">${cityName || "Unknown"}</div>
          <div style="font-size: 12px;">
            <div>Submissions: <b>${Number(count).toLocaleString()}</b></div>
            <div>Emissions (computed): <b>${Number(emission || 0).toLocaleString()}</b></div>
            <div>Index: <b>${level ? String(level).toUpperCase() : "N/A"}</b></div>
          </div>
        </div>
      `;
      layer.bindTooltip(html, { sticky: true });

      layer.on("click", () => {
        if (!cityName) return;
        setSelectedCityOnMap(cityName);
        setCity(cityName);
        fitToSelectedCity(map, cityName);
      });
    };

    if (showEmissionLayer) {
      const emissionLayer = L.geoJSON(lagunaBoundaries, {
        style: (feature) => {
          const cityName = feature?.properties?.city_name ? String(feature.properties.city_name) : "";
          const level = cityLevels[cityName] || null;
          return {
            color: "#111827",
            weight: 1,
            fillOpacity: 0.45,
            fillColor: levelColor(level),
          };
        },
        onEachFeature: onEach,
      });
      emissionLayer.addTo(map);
      emissionLayerRef.current = emissionLayer;
    }

    if (showSurveyLayer) {
      const surveyLayer = L.geoJSON(lagunaBoundaries, {
        style: (feature) => {
          const cityName = feature?.properties?.city_name ? String(feature.properties.city_name) : "";
          const surveyed = (cityCounts[cityName] || 0) > 0;
          return {
            color: "#111827",
            weight: 1,
            fillOpacity: 0.25,
            fillColor: surveyedFillColor(surveyed),
          };
        },
        onEachFeature: onEach,
      });
      surveyLayer.addTo(map);
      surveyLayerRef.current = surveyLayer;
    }

    fitToSelectedCity(map, city);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lagunaBoundaries, showEmissionLayer, showSurveyLayer, cityCounts, cityEmissions, cityLevels, city]);

  return (
    <AuthenticatedLayout title="Map">
      <PageHeader
        title="Community-Level GHG Map"
        subtitle="Use the year, municipality, and layer controls to explore survey coverage and computed emissions per municipality."
      />

      <div className="px-6 pb-8">
        {geoError ? <div className="mb-3 text-sm text-red-600">{geoError}</div> : null}

        <div className="flex flex-wrap items-end gap-4 mb-4">
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

          <div>
            <label className="block text-xs text-gray-600 mb-1">Select Municipality</label>
            <select
              className="border rounded px-3 py-2 text-sm bg-white"
              value={city}
              onChange={(e) => {
                setSelectedCityOnMap(null);
                setCity(e.target.value);
              }}
              disabled={!lagunaBoundaries}
            >
              <option value="__ALL__">All Municipalities</option>
              {allCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-500">
            {geoLoading ? "Loading map geometry…" : null}
            {loadingStats ? " Computing…" : null}
            {!loadingStats && statsError ? <span className="text-red-600">{statsError}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-900">LAYERS</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                    onClick={() => setAllForms(true)}
                    disabled={formsLoading}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="text-xs border rounded px-2 py-1 hover:bg-gray-50"
                    onClick={() => setAllForms(false)}
                    disabled={formsLoading}
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {formsLoading ? <div className="text-sm text-gray-600">Loading forms…</div> : null}
                {formsError ? <div className="text-sm text-red-600">{formsError}</div> : null}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input type="checkbox" checked={showEmissionLayer} onChange={(e) => setShowEmissionLayer(e.target.checked)} />
                    Emission Index (low/medium/high)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input type="checkbox" checked={showSurveyLayer} onChange={(e) => setShowSurveyLayer(e.target.checked)} />
                    Survey Area (surveyed/unsurveyed)
                  </label>
                </div>

                <div className="border-t pt-3">
                  {formGroups.length === 0 ? (
                    <div className="text-sm text-gray-600">No forms found for year {year}.</div>
                  ) : (
                    <div className="space-y-3">
                      {formGroups.map((g) => (
                        <div key={g.sector} className="space-y-2">
                          <div className="text-sm font-semibold text-gray-900">{toLabel(g.sector)}</div>
                          <div className="space-y-2 pl-1">
                            {g.items.map((f) => {
                              const id = String(f.id);
                              const checked = enabledFormIds.has(id);
                              return (
                                <label key={id} className="flex items-center gap-2 text-sm text-gray-800">
                                  <input type="checkbox" checked={checked} onChange={() => toggleFormId(id)} />
                                  <span className="truncate" title={asFormLabel(f)}>
                                    {asFormLabel(f)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  Enabled layers: <b>{enabledFormIds.size}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div ref={mapDivRef} className="h-[520px] w-full" />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="bg-gray-900 text-white rounded-lg p-4">
              <div className="text-sm font-semibold mb-2">{rightPanel.title}</div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-200">Submissions</span>
                  <span className="font-semibold">{Number(rightPanel.submissions || 0).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-200">Emissions (computed)</span>
                  <span className="font-semibold">{Number(rightPanel.emissions || 0).toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-200">Index</span>
                  <span className="font-semibold">{rightPanel.level ? rightPanel.level.toUpperCase() : "—"}</span>
                </div>
              </div>
            </div>

            <Legend mode="emission" />
            <Legend mode="survey" />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
