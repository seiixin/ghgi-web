import React, { useMemo } from "react";
import FieldInput from "./FieldInput";

/**
 * mapping: object with keys OR config objects
 * fieldMeta: optional { [fieldKey]: { label, type, options } }
 */
export default function FormRendererFromMapping({ mapping, fieldMeta, answers, onChange }) {
  const keys = useMemo(() => {
    const obj = mapping && typeof mapping === "object" ? mapping : {};
    return Object.keys(obj).sort((a, b) => a.localeCompare(b));
  }, [mapping]);

  function setField(key, value) {
    onChange?.({ ...(answers || {}), [key]: value });
  }

  if (!keys.length) return <div className="text-sm text-gray-600">No fields found.</div>;

  return (
    <div className="mt-2">
      <div className="text-sm font-semibold text-gray-900 mb-2">Answer Fields</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {keys.map((k) => {
          const mappingCfg = mapping?.[k];
          const meta = fieldMeta?.[k];

          // Normalize config:
          const cfg =
            (mappingCfg && typeof mappingCfg === "object" && !Array.isArray(mappingCfg))
              ? mappingCfg
              : (meta || {});

          return (
            <FieldInput
              key={k}
              fieldKey={k}
              config={cfg}
              value={answers?.[k]}
              onChange={(v) => setField(k, v)}
            />
          );
        })}
      </div>
    </div>
  );
}
