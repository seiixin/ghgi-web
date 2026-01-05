import { Button } from './Button';

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', tone = 'danger', onClose, onConfirm, busy }) {
  if (!open) return null;
  const btnVariant = tone === 'danger' ? 'danger' : 'primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {message ? <div className="text-xs text-gray-500 mt-1">{message}</div> : null}
        </div>
        <div className="p-4 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant={btnVariant} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
