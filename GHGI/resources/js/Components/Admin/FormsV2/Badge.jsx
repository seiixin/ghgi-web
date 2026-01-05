export default function Badge({ children, tone = 'gray' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    gray: 'bg-gray-50 text-gray-700 ring-gray-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  };
  const cls = tones[tone] || tones.gray;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {children}
    </span>
  );
}
