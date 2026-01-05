import Card from './Card';

function InputForField({ f }) {
  if (f.type === 'select') {
    return (
      <select className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
        <option value="">Select…</option>
        {(f.options || []).map((opt, idx) => (
          <option key={idx} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  const type = f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text');
  return (
    <input
      type={type}
      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
    />
  );
}

export default function FormPreview({ title, description, fields }) {
  return (
    <Card title="Form Preview" subtitle="Google-Form style preview (options visible for select fields).">
      <div className="space-y-4">
        <div>
          <div className="text-lg font-bold text-gray-900">{title || 'Untitled form'}</div>
          {description ? <div className="text-sm text-gray-600 mt-1">{description}</div> : null}
        </div>

        <div className="space-y-4">
          {(fields || []).map((f, idx) => (
            <div key={f.key || idx} className="rounded-2xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">
                {f.label || f.key}
                {f.required ? <span className="text-rose-600"> *</span> : null}
              </div>
              <div className="text-xs text-gray-500 mt-1">{f.key} • {f.type}</div>

              <div className="mt-3">
                <InputForField f={f} />
              </div>

              {f.type === 'select' ? (
                <div className="mt-3 text-xs text-gray-600">
                  <div className="font-semibold text-gray-700">Options</div>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {(f.options || []).map((opt, i) => <li key={i}>{opt}</li>)}
                    {(f.options || []).length === 0 ? <li className="text-gray-500">No options yet</li> : null}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
          {(fields || []).length === 0 ? (
            <div className="text-sm text-gray-500">No fields.</div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
