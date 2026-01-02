import React from "react";
import AuthenticatedLayout from "../../Layouts/AuthenticatedLayout";
import StatCard from "../../Components/Shared/StatCard";

export default function Dashboard({ latestYear, totalLgus, totalEmissions }) {
  return (
    <AuthenticatedLayout title="Dashboard">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard
          label="LATEST INVENTORY YEAR"
          value={latestYear}
          hint={`All summaries and visuals are currently showing data for ${latestYear}.`}
        />
        <StatCard
          label="TOTAL LGUS"
          value={totalLgus}
          hint="Municipalities included in the community-level GHG inventory."
        />
        <StatCard
          label="TOTAL EMISSIONS"
          value={Number(totalEmissions).toLocaleString()}
          suffix="tCO₂e"
          hint="Sum of Scope 1, 2, and 3 emissions across all municipalities."
        />
      </div>
    </AuthenticatedLayout>
  );
}
