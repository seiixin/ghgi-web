import React from "react";
import Badge from "../Shared/Badge";

export default function ViewOnlyHint({ role }) {
  const r = (role || "ENUMERATOR").toUpperCase();
  const isAdmin = r === "ADMIN";
  if (isAdmin) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <Badge tone="blue">VIEW ONLY</Badge>
      <div className="text-sm text-slate-700">
        You can view LGU master data, but changes require an Admin account.
      </div>
    </div>
  );
}
