import React from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import EmptyState from "../../../Components/Shared/EmptyState";

export default function MapIndex({ year, mapDefaults }) {
  return (
    <AuthenticatedLayout title="Map">
      <PageHeader title="Map" subtitle={`Spatial overlays and buffers around points (year ${year}).`} />
      <EmptyState title="Map module foundation" description={`Defaults: center=(${mapDefaults?.center_lat}, ${mapDefaults?.center_lng}), zoom=${mapDefaults?.zoom}. Module 3 will implement Leaflet layers and point buffers.`} />
    </AuthenticatedLayout>
  );
}
