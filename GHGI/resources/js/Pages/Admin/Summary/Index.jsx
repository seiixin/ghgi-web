import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import EmptyState from "../../../Components/Shared/EmptyState";

export default function SummaryIndex({ year }) {
  return (
    <AuthenticatedLayout title="GHG Summary">
      <PageHeader title="GHG Summary" subtitle={`Totals and charts for year ${year}.`} />
      <EmptyState title="Summary module foundation" description="Module 2 will add charts, sector totals, scope totals, and exports." />
    </AuthenticatedLayout>
  );
}
