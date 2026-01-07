// resources/js/Components/Admin/Summary/SummaryTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import EmptyState from "../../Shared/EmptyState";

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
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

function Pagination({ page, totalPages, onPageChange, className = "" }) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (p) => onPageChange(clamp(p, 1, Math.max(1, totalPages)));

  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  const start = clamp(page - half, 1, Math.max(1, totalPages - windowSize + 1));
  const end = clamp(start + windowSize - 1, 1, totalPages);

  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={!canPrev}
        className={`px-3 py-2 text-xs rounded-lg border ${
          canPrev ? "bg-white hover:bg-gray-50" : "bg-gray-50 text-gray-400"
        }`}
      >
        First
      </button>
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={!canPrev}
        className={`px-3 py-2 text-xs rounded-lg border ${
          canPrev ? "bg-white hover:bg-gray-50" : "bg-gray-50 text-gray-400"
        }`}
      >
        Prev
      </button>

      <div className="flex items-center gap-1">
        {start > 1 ? <span className="px-2 text-xs text-gray-500">…</span> : null}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className={`h-9 w-9 text-xs rounded-lg border ${
              p === page ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages ? <span className="px-2 text-xs text-gray-500">…</span> : null}
      </div>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={!canNext}
        className={`px-3 py-2 text-xs rounded-lg border ${
          canNext ? "bg-white hover:bg-gray-50" : "bg-gray-50 text-gray-400"
        }`}
      >
        Next
      </button>
      <button
        type="button"
        onClick={() => go(totalPages)}
        disabled={!canNext}
        className={`px-3 py-2 text-xs rounded-lg border ${
          canNext ? "bg-white hover:bg-gray-50" : "bg-gray-50 text-gray-400"
        }`}
      >
        Last
      </button>
    </div>
  );
}

function BigInlineLoader({ text = "Computing…" }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-full border-[10px] border-gray-200 border-t-gray-900 animate-spin" />
        <div className="text-sm font-semibold text-gray-900">{text}</div>
      </div>
    </div>
  );
}

export default function SummaryTable({
  yearApplied,
  enabledFormTypeIdsForYearApplied = [],
  rowsForTable = [],
  totalEmissions = 0,
  loadingSelected = false,
  defaultPageSize = 5,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalRows = rowsForTable.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / Math.max(1, Number(pageSize) || defaultPageSize)));

  useEffect(() => {
    setPage(1);
  }, [yearApplied, pageSize, totalRows]);

  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || defaultPageSize);
    const p = clamp(page, 1, totalPages);
    const start = (p - 1) * size;
    return rowsForTable.slice(start, start + size);
  }, [rowsForTable, page, pageSize, totalPages, defaultPageSize]);

  const pageRangeText = useMemo(() => {
    if (!totalRows) return "0";
    const size = Math.max(1, Number(pageSize) || defaultPageSize);
    const p = clamp(page, 1, totalPages);
    const start = (p - 1) * size + 1;
    const end = Math.min(totalRows, p * size);
    return `${start}-${end} of ${totalRows}`;
  }, [totalRows, page, pageSize, totalPages, defaultPageSize]);

  const showEmptySelectYear = !yearApplied;
  const showEmptyNoForms = yearApplied && enabledFormTypeIdsForYearApplied.length === 0 && !loadingSelected;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b">
        <div className="text-sm text-gray-700">
          Totals below are computed by summing numeric emission values from each submitted form response (same as Map).
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Rows per page</span>
            <select
              className="border rounded-lg px-2 py-1 text-xs bg-white"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              disabled={loadingSelected || !yearApplied}
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500 tabular-nums">{pageRangeText}</span>
          </div>

          <Pagination page={clamp(page, 1, totalPages)} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* IMPORTANT: relative wrapper so overlay can cover table area */}
      <div className="relative p-4 overflow-auto">
        {/* BIG LOADER: base it on loadingSelected ("Computing...") */}
        {loadingSelected ? <BigInlineLoader text="Computing…" /> : null}

        {showEmptySelectYear ? (
          <EmptyState
            title="Select a year to compute"
            description="Choose a year then click Apply to compute the table and pie chart. The trend line still loads independently."
          />
        ) : showEmptyNoForms ? (
          <EmptyState
            title="No forms for this year"
            description={`No schema_versions matched year ${yearApplied}. Add schema versions or select another year.`}
          />
        ) : (
          <>
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
                {pagedRows.length ? (
                  pagedRows.map((r) => (
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
                    <td colSpan={4} className="py-8 px-3 text-gray-600">
                      {loadingSelected ? "Computing…" : "No computed totals yet (needs submitted submissions)."}
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

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-500 tabular-nums">{pageRangeText}</div>
              <Pagination page={clamp(page, 1, totalPages)} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
