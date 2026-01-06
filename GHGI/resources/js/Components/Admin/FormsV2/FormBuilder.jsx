// resources/js/Pages/Admin/Forms/Partials/FormBuilder.jsx
import { useMemo, useState } from "react";
import Card from "./Card";
import { Button } from "./Button";
import { slugifyKey } from "./schema";

function emptyNewField() {
  return { key: "", label: "", type: "text", required: false, optionsText: "" };
}

function parseOptions(text) {
  return String(text || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * UPDATED (Year editable):
 * - Added Year input (controlled by props).
 * - Year is NOT embedded into fields; it's just a schema/mapping context.
 *
 * Props:
 *  - year: number|string
 *  - setYear: (nextYear:number)=>void
 *  - fields: array
 *  - setFields: fn
 */
export default function FormBuilder({ year, setYear, fields, setFields }) {
  const [newField, setNewField] = useState(emptyNewField());
  const computed = useMemo(() => fields || [], [fields]);

  const yearNum = useMemo(() => {
    const n = Number(year);
    return Number.isFinite(n) ? n : new Date().getFullYear();
  }, [year]);

  function onYearChange(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setYear?.(n);
  }

  function addToSchema() {
    const key = slugifyKey(newField.key || newField.label);
    const label = String(newField.label || "").trim();
    const type = newField.type;

    if (!key || !label) return;

    const next = [
      ...computed,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        key,
        label,
        type,
        required: !!newField.required,
        options: type === "select" ? parseOptions(newField.optionsText) : [],
      },
    ];

    setFields(next);
    setNewField(emptyNewField());
  }

  function removeField(idx) {
    setFields(computed.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      {/* YEAR CONTEXT */}
      <Card
        title="Schema Year"
        subtitle="This year controls which schema_versions and mappings are being edited/saved."
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="text-xs font-semibold text-gray-700">Year</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={yearNum}
              onChange={(e) => onYearChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="sm:col-span-8 text-xs text-gray-500">
            Tip: change year first, then load/select the form so the backend returns schema_versions + mappings filtered to that year.
          </div>
        </div>
      </Card>

      {/* EXISTING BUILDER UI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <Card title="Fields" subtitle="These fields will appear in the enumerator's survey form.">
            {computed.length === 0 ? (
              <div className="text-sm text-gray-500">No fields yet. Add one on the right.</div>
            ) : (
              <div className="space-y-2">
                {computed.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{idx + 1}</div>
                      <div className="text-xs text-gray-600 font-mono truncate">
                        {f.key} • {f.type}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {f.label}
                        {f.required ? " (required)" : ""}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-900"
                    >
                      Remove
                    </button>
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

              {newField.type === "select" ? (
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

              <Button type="button" variant="dark" onClick={addToSchema} className="w-full">
                Add to schema
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
