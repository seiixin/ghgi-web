export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60';
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500',
    dark: 'bg-slate-900 text-white hover:bg-slate-800',
    outline: 'border border-gray-200 hover:bg-gray-50 text-gray-900',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    ghost: 'hover:bg-gray-50 text-gray-900',
  };
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
