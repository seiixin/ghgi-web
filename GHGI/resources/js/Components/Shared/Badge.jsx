import React from 'react';

export default function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    green: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    blue: 'bg-sky-100 text-sky-800 ring-sky-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    red: 'bg-rose-100 text-rose-800 ring-rose-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tones[tone] ?? tones.slate}`}>
      {children}
    </span>
  );
}
