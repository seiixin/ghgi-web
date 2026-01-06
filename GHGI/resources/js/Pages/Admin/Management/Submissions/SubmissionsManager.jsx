import React, { useState } from "react";
import NewSubmissionWizard from "../../Submissions/Partials/NewSubmissionWizard";
import SubmissionsTable from "../../Submissions/Partials/SubmissionsTable";

export default function SubmissionsManager() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <NewSubmissionWizard onCreatedOrSubmitted={() => setRefreshKey((k) => k + 1)} />
      <SubmissionsTable refreshKey={refreshKey} />
    </div>
  );
}
