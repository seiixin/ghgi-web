import React from 'react';

export default function EmptyState({ title = 'No data', description = 'There is nothing to display yet.' }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
      <div className="mx-auto mb-2 h-10 w-10 rounded-2xl bg-slate-100" />
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
    </div>
  );
}
