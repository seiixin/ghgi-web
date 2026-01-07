// resources/js/Components/Admin/Summary/PieChart.jsx
import React, { useMemo } from "react";

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

/**
 * Pie chart + inline big spinner loader (same style as LineChart).
 *
 * Props:
 * - data: [{label, value}]
 * - size: number
 * - loading: boolean
 * - loadingText: string
 */
export default function PieChart({
  data = [],
  size = 260,
  loading = false,
  loadingText = "Computing…",
}) {
  const total = useMemo(
    () => (Array.isArray(data) ? data.reduce((acc, d) => acc + (Number(d?.value) || 0), 0) : 0),
    [data]
  );

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const slices = useMemo(() => {
    if (!total) return [];
    let angle = 0;
    return (data || []).map((d, idx) => {
      const val = Number(d?.value) || 0;
      const sliceAngle = (val / total) * 360;
      const start = angle;
      const end = angle + sliceAngle;
      angle = end;
      return {
        ...d,
        path: arcPath(cx, cy, r, start, end),
        color: hslColor(idx, (data || []).length),
      };
    });
  }, [data, total, cx, cy, r]);

  const showNoData = !loading && !total;

  return (
    <div className="w-full">
      <div className="relative w-full">
        {/* inline big loader (covers the pie + legend area) */}
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-20 w-20 rounded-full border-[10px] border-gray-200 border-t-gray-900 animate-spin"
                aria-label="Loading"
              />
              <div className="text-sm font-semibold text-gray-900">{loadingText}</div>
            </div>
          </div>
        ) : null}

        {/* content */}
        {showNoData ? (
          <div className="text-xs text-gray-500">No data</div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 w-full">
            <div className="w-full sm:w-[55%] max-w-[340px] mx-auto sm:mx-0">
              <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto block">
                {/* only render slices when not loading + with total */}
                {!loading && total
                  ? slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1" />)
                  : null}
              </svg>
            </div>

            <div className="w-full sm:flex-1 text-xs text-gray-700 space-y-2 min-w-0">
              {/* only render legend when not loading + with total */}
              {!loading && total
                ? slices.map((s, i) => {
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
                  })
                : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
