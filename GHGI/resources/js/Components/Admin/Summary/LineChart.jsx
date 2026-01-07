// resources/js/Components/Admin/Summary/LineChart.jsx
import React, { useMemo } from "react";

/**
 * Simple SVG line chart + big centered spinner overlay
 *
 * Usage:
 * <LineChart labels={...} values={...} loading={true} />
 *
 * - loading=true will show a large spinner INSIDE the chart area
 * - still renders axes/grid behind (optional; can be hidden if you want)
 */
export default function LineChart({ labels = [], values = [], height = 220, loading = false }) {
  const w = 520;
  const h = height;
  const pad = 28;

  const { maxV, points, d, minV } = useMemo(() => {
    const nums = (values || []).map((v) => Number(v) || 0);
    const maxV = Math.max(1, ...nums);
    const minV = 0;

    const points = nums.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, nums.length - 1);
      const y = h - pad - (v - minV) * ((h - pad * 2) / Math.max(1, maxV - minV));
      return { x, y };
    });

    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");

    return { maxV, minV, points, d };
  }, [values, w, h, pad]);

  const hasData = (values || []).some((v) => (Number(v) || 0) > 0) && (values || []).length >= 2;

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative min-w-[520px]">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
          {/* axes */}
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
          <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />

          {/* horizontal grid + y labels */}
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

          {/* line + points */}
          {hasData ? (
            <>
              <path d={d} fill="none" stroke="#2563eb" strokeWidth="2.5" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#2563eb" strokeWidth="2" />
              ))}
            </>
          ) : (
            <text x={w / 2} y={h / 2} fontSize="12" fill="#6b7280" textAnchor="middle">
              No data
            </text>
          )}

          {/* x labels */}
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

        {/* BIG LOADING OVERLAY (inside the chart) */}
        {loading ? (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-20 rounded-full border-[10px] border-gray-200 border-t-gray-900 animate-spin" />
              <div className="text-sm font-semibold text-gray-900">Computing…</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
