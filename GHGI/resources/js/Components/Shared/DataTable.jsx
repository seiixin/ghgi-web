import React from 'react';

export default function DataTable({ columns = [], rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-slate-700">
                  {typeof c.render === 'function' ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
