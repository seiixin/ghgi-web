import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import EmptyState from "../../../Components/Shared/EmptyState";

export default function QuantificationIndex({ year }) {
  return (
    <AuthenticatedLayout title="Quantification Sheet">
      <PageHeader title="Quantification Sheet" subtitle={`Normalized view for inventory year ${year}.`} />
      <EmptyState title="Quantification module foundation" description="Module 1 will implement the per-tab sheets, filters, and ingestion from mobile submissions." />
    </AuthenticatedLayout>
  );
}
