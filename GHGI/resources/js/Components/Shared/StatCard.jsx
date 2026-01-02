import React from 'react';

export default function StatCard({ label, value, hint, suffix }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {suffix ? <div className="pb-1 text-sm text-slate-500">{suffix}</div> : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-600">{hint}</div> : null}
    </div>
  );
}
