import { useMemo, useState } from 'react';
import Card from './Card';
import { Button } from './Button';
import { slugifyKey } from './schema';

function emptyNewField() {
  return { key: '', label: '', type: 'text', required: false, optionsText: '' };
}
function parseOptions(text) {
  return String(text || '').split('\n').map((x) => x.trim()).filter(Boolean);
}
function optionsToText(arr) {
  return (Array.isArray(arr) ? arr : []).join('\n');
}

export default function FormBuilderEditable({ fields, setFields }) {
  const [newField, setNewField] = useState(emptyNewField());
  const list = useMemo(() => fields || [], [fields]);

  function addField() {
    const key = slugifyKey(newField.key || newField.label);
    const label = String(newField.label || '').trim();
    const type = newField.type;
    if (!key || !label) return;

    const next = [...list, {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      key,
      label,
      type,
      required: !!newField.required,
      options: type === 'select' ? parseOptions(newField.optionsText) : [],
    }];
    setFields(next);
    setNewField(emptyNewField());
  }

  function remove(idx) {
    setFields(list.filter((_, i) => i !== idx));
  }

  function update(idx, patch) {
    const next = list.map((f, i) => i === idx ? { ...f, ...patch } : f);
    setFields(next);
  }

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setFields(next);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7">
        <Card title="Fields" subtitle="Add, edit, reorder, and remove fields.">
          {list.length === 0 ? (
            <div className="text-sm text-gray-500">No fields yet. Add one on the right.</div>
          ) : (
            <div className="space-y-3">
              {list.map((f, idx) => (
                <div key={f.id || idx} className="rounded-2xl border border-gray-200 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-900">Field {idx + 1}</div>
                    <div className="inline-flex items-center gap-2">
                      <button type="button" className="text-xs font-semibold text-gray-500 hover:text-gray-900" onClick={() => move(idx, -1)}>Up</button>
                      <button type="button" className="text-xs font-semibold text-gray-500 hover:text-gray-900" onClick={() => move(idx, 1)}>Down</button>
                      <button type="button" className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => remove(idx)}>Delete</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Key</label>
                      <input
                        value={f.key}
                        onChange={(e) => update(idx, { key: slugifyKey(e.target.value) })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Label</label>
                      <input
                        value={f.label}
                        onChange={(e) => update(idx, { label: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Type</label>
                      <select
                        value={f.type}
                        onChange={(e) => update(idx, { type: e.target.value, options: e.target.value === 'select' ? (f.options || []) : [] })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 md:mt-6">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => update(idx, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Required
                    </label>

                    {f.type === 'select' ? (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-gray-700">Options (one per line)</label>
                        <textarea
                          value={optionsToText(f.options)}
                          onChange={(e) => update(idx, { options: parseOptions(e.target.value) })}
                          rows={3}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-5">
        <Card title="Add Field">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Field key (machine name)</label>
              <input
                value={newField.key}
                onChange={(e) => setNewField((p) => ({ ...p, key: e.target.value }))}
                placeholder="e.g. household_count"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Label (shown to enumerator)</label>
              <input
                value={newField.label}
                onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g. Number of households"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Field type</label>
              <select
                value={newField.type}
                onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
              </select>
            </div>

            {newField.type === 'select' ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Options (one per line)</label>
                <textarea
                  value={newField.optionsText}
                  onChange={(e) => setNewField((p) => ({ ...p, optionsText: e.target.value }))}
                  rows={4}
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!newField.required}
                onChange={(e) => setNewField((p) => ({ ...p, required: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              Required field
            </label>

            <Button type="button" variant="dark" onClick={addField} className="w-full">
              Add to schema
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
