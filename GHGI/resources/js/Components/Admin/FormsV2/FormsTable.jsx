import Badge from './Badge';
import { Button } from './Button';

function municipalityLabel(uiJson) {
  const m = uiJson?.meta?.municipality;
  return m ? String(m).toUpperCase() : 'ALL LGUS';
}
function barangayLabel(uiJson) {
  const b = uiJson?.meta?.barangay;
  return b ? String(b) : 'N/A';
}

export default function FormsTable({ rows, onView, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-xs font-semibold text-gray-600">
            <th className="px-4 py-3 text-left">TITLE</th>
            <th className="px-4 py-3 text-left">MUNICIPALITY / BARANGAY</th>
            <th className="px-4 py-3 text-left">STATUS</th>
            <th className="px-4 py-3 text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/40">
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">{r.key}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-indigo-600 uppercase">{municipalityLabel(r.activeSchema?.ui_json || {})}</div>
                <div className="text-xs text-gray-600">{barangayLabel(r.activeSchema?.ui_json || {})}</div>
              </td>
              <td className="px-4 py-3">
                {r.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-2">
                  <Button type="button" variant="ghost" className="px-3 py-1.5" onClick={() => onView(r)}>View</Button>
                  <Button type="button" variant="ghost" className="px-3 py-1.5" onClick={() => onEdit(r)}>Edit</Button>
                  <Button type="button" variant="ghost" className="px-3 py-1.5 text-rose-700" onClick={() => onDelete(r)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">No forms yet.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
