import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import DataTable from "../../../Components/Shared/DataTable";

export default function SubmissionsIndex({ rows }) {
  const columns = [
    { key: "id", label: "ID" },
    { key: "source", label: "Source" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created" },
  ];

  return (
    <AuthenticatedLayout title="Submissions">
      <PageHeader title="Submissions" subtitle="Incoming records from the mobile app will appear here." />
      <DataTable columns={columns} rows={rows ?? []} />
    </AuthenticatedLayout>
  );
}
