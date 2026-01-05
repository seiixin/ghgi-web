export default function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-white ring-1 ring-gray-200 ${className}`}>
      {(title || subtitle || right) ? (
        <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <div className="text-sm font-semibold text-gray-900">{title}</div> : null}
            {subtitle ? <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
