import React from 'react';

export default function Modal({ open, title, children, footer, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close modal overlay" />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
        <div className="border-b border-slate-100 p-4">
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="p-4">{children}</div>
        {footer ? <div className="border-t border-slate-100 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
