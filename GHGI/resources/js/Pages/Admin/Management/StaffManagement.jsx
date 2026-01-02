import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

export default function StaffManagement() {
  return (
    <AuthenticatedLayout title="Staff Management">
      <PageHeader title="Staff Management" subtitle="Admin-only user management and role assignments." />

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold text-slate-900">Planned Admin Features (placeholder)</div>
        <ul className="mt-3 space-y-2 list-disc pl-5">
            <li className="text-sm text-slate-700">CRUD users (create enumerators, reset passwords)</li>
        <li className="text-sm text-slate-700">Assign roles: ADMIN / ENUMERATOR</li>
        <li className="text-sm text-slate-700">Deactivate users (future)</li>
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
