import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

export default function Forms() {
  return (
    <AuthenticatedLayout title="Forms">
      <PageHeader title="Forms" subtitle="Admin-only management of form types, sheets/tabs, and validation rules." />

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Planned Admin Features (placeholder)</div>
        <ul className="mt-3 space-y-2 list-disc pl-5">
            <li className="text-sm text-slate-700">CRUD: Form Types (matches Excel tabs / mobile FormType seeder)</li>
        <li className="text-sm text-slate-700">Configure required fields, units, and validation</li>
        <li className="text-sm text-slate-700">Publish/unpublish forms for enumerators</li>
        <li className="text-sm text-slate-700">Versioning / change log (future)</li>
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
