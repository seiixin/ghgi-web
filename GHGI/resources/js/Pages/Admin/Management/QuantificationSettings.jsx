import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

export default function QuantificationSettings() {
  return (
    <AuthenticatedLayout title="Quantification Settings">
      <PageHeader title="Quantification Settings" subtitle="Admin-only settings for factors, defaults, and calculation rules." />

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Planned Admin Features (placeholder)</div>
        <ul className="mt-3 space-y-2 list-disc pl-5">
            <li className="text-sm text-slate-700">Manage emission factors and activity parameters</li>
        <li className="text-sm text-slate-700">Set default inventory year and LGU coverage rules</li>
        <li className="text-sm text-slate-700">Lock/unlock quantification per year (future)</li>
        </ul>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">Note</div>
          <div className="mt-1 text-sm text-slate-700">
            Enumerators can view the main modules via the sidebar. CRUD/management actions are restricted by backend routes using <code>role:ADMIN</code>.
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
