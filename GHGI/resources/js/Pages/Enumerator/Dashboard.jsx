import React from "react";
import AuthenticatedLayout from "../../Layouts/AuthenticatedLayout";
import EmptyState from "../../Components/Shared/EmptyState";

export default function EnumeratorDashboard({ year }) {
  return (
    <AuthenticatedLayout title="Forms">
      <EmptyState title="Enumerator module foundation" description={`Year: ${year}. This will later host submission lists and draft forms.`} />
    </AuthenticatedLayout>
  );
}
