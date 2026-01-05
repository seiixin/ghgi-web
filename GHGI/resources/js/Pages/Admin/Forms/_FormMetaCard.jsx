import Card from '@/Components/Admin/FormsV2/Card';

export function FormMetaCard({
  title, setTitle,
  municipality, setMunicipality,
  barangay, setBarangay,
  active, setActive,
  key, setKey,
  sectorKey, setSectorKey,
  note
}) {
  return (
    <Card>
      <div className="space-y-4">
        {note ? <div className="text-xs text-gray-500">{note}</div> : null}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Municipality</label>
            <select value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
              <option>All LGUs</option>
              <option>Los Baños</option>
              <option>Calamba</option>
              <option>San Pablo</option>
              <option>Santa Rosa</option>
            </select>
            <div className="text-[11px] text-gray-500">Placeholder; connect to LGU table later.</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Barangay (optional)</label>
            <input value={barangay} onChange={(e) => setBarangay(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Form key (machine)</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Sector key</label>
            <input value={sectorKey} onChange={(e) => setSectorKey(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Active (visible to enumerators)
        </label>
      </div>
    </Card>
  );
}
