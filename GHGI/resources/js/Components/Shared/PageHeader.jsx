import React from "react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

/**
 * PageHeader
 * - No nested <button> wrappers.
 * - Decorative layers use pointer-events-none.
 * - Action slots (left/right) are always clickable.
 */
export default function PageHeader({ title, subtitle, left, right }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {/* subtle top accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600" />

      <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
          ) : null}
        </div>

        {(left || right) ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {left ? <div className="pointer-events-auto">{left}</div> : null}
            {right ? <div className="pointer-events-auto">{right}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
