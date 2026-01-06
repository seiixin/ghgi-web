import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import SubmissionsManager from "./Submissions/SubmissionsManager";

export default function QuantificationSettings() {
  const tabs = useMemo(
    () => [
      { key: "submissions", label: "Submissions" },
      // Add more tabs later: Forms, Items, Summary, etc.
    ],
    []
  );

  const [activeTab, setActiveTab] = useState("submissions");

  return (
    <AuthenticatedLayout title="Quantification Settings">
      <PageHeader
        title="Quantification Settings"
        subtitle="Manage quantification configuration and submissions."
      />

      <div className="mt-4">
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((t) => {
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={[
                  "px-3 py-2 text-sm font-medium",
                  isActive
                    ? "border-b-2 border-indigo-600 text-indigo-700"
                    : "text-gray-600 hover:text-gray-900",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="py-4">
          {activeTab === "submissions" && <SubmissionsManager />}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
