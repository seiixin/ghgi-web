import React, { useMemo } from "react";

function fallbackLabel(fieldKey) {
  return String(fieldKey).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCasexCase? m.toUpperCase() : m.toUpperCase());
}

export default function FieldInput({ fieldKey, config = {}, value, onChange }) {
  const type = useMemo(() => config.type || "text", [config.type]);
  const label = useMemo(() => config.label || fallbackLabel(fieldKey), [config.label, fieldKey]);
  const options = useMemo(() => config.options || [], [config.options]);

  // checkbox expects array
  const checkboxValue = Array.isArray(value) ? value : [];

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>

      {type === "select" && (
        <select
          className="border rounded px-2 py-2 text-sm w-full"
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="">Select...</option>
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const text = typeof opt === "string" ? opt : (opt.label ?? opt.value);
            return <option key={val} value={val}>{text}</option>;
          })}
        </select>
      )}

      {type === "radio" && (
        <div className="space-y-2">
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const text = typeof opt === "string" ? opt : (opt.label ?? opt.value);
            return (
              <label key={val} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={fieldKey}
                  checked={(value ?? "") === val}
                  onChange={() => onChange?.(val)}
                />
                <span>{text}</span>
              </label>
            );
          })}
        </div>
      )}

      {type === "checkbox" && (
        <div className="space-y-2">
          {options.map((opt) => {
            const val = typeof opt === "string" ? opt : opt.value;
            const text = typeof opt === "string" ? opt : (opt.label ?? opt.value);
            const checked = checkboxValue.includes(val);

            return (
              <label key={val} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? checkboxValue.filter((x) => x !== val)
                      : [...checkboxValue, val];
                    onChange?.(next);
                  }}
                />
                <span>{text}</span>
              </label>
            );
          })}
        </div>
      )}

      {type !== "select" && type !== "radio" && type !== "checkbox" && (
        <input
          type={type === "number" ? "number" : type === "date" ? "date" : "text"}
          className="border rounded px-2 py-2 text-sm w-full"
          value={value ?? ""}
          onChange={(e) => {
            const v = type === "number"
              ? (e.target.value === "" ? "" : Number(e.target.value))
              : e.target.value;
            onChange?.(v);
          }}
        />
      )}

      <div className="mt-1 text-[11px] text-gray-400">{fieldKey}</div>
    </div>
  );
}
