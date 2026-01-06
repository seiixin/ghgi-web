// resources/js/Pages/Admin/Quantification/Index.jsx
import React, { useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

import ResponsesMatrixOnly from "../Submissions/Partials/ResponsesMatrixOnly";

function clampYear(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return new Date().getFullYear();
  if (n < 2000) return 2000;
  if (n > 2100) return 2100;
  return Math.trunc(n);
}

export default function QuantificationIndex({ auth, year }) {
  const initialYear = useMemo(() => clampYear(year ?? new Date().getFullYear()), [year]);

  const [yearFilter, setYearFilter] = useState(initialYear);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AuthenticatedLayout user={auth?.user} title="Quantification Sheet">
      <Head title="Quantification Sheet" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <PageHeader
          title="Quantification Sheet"
          subtitle={`Responses Matrix for inventory year ${yearFilter}.`}
          right={
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-600">Year</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  className="border rounded px-2 py-2 text-sm w-28"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(clampYear(e.target.value))}
                />
              </div>

              <button
                type="button"
                className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => setRefreshKey((k) => k + 1)}
              >
                Apply
              </button>
            </div>
          }
        />

        <ResponsesMatrixOnly refreshKey={refreshKey} initialYear={yearFilter} />
      </div>
    </AuthenticatedLayout>
  );
}
