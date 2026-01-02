import React from "react";
import { Head, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "../../Layouts/AuthenticatedLayout";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import DeleteUserForm from "./Partials/DeleteUserForm";

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
      <div className="mb-4">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function Edit({ mustVerifyEmail, status }) {
  const { props } = usePage();
  const user = props?.auth?.user ?? null;

  return (
    <AuthenticatedLayout title="Profile">
      <Head title="Profile" />

      <div className="max-w-4xl space-y-6">
        <Card
          title="Profile information"
          subtitle="Update your account's profile information and email address."
        >
          <UpdateProfileInformationForm
            mustVerifyEmail={mustVerifyEmail}
            status={status}
            user={user}
          />
        </Card>

        <Card
          title="Update password"
          subtitle="Use a strong, unique password to protect your account."
        >
          <UpdatePasswordForm />
        </Card>

        <Card
          title="Delete account"
          subtitle="Permanently delete your account and all associated data."
        >
          <DeleteUserForm />
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
