// GHGI/resources/js/Pages/Admin/MasterData/LGUs/Index.jsx
import React, { useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import FilterBar from "../../../Components/Shared/FilterBar";
import DataTable from "../../../Components/Shared/DataTable";
import EmptyState from "../../../Components/Shared/EmptyState";
import Badge from "../../../Components/Shared/Badge";
import ViewOnlyHint from "../../../Components/MasterData/ViewOnlyHint";
import NewLgu from "../../../Components/MasterData/NewLgu";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function TextField({ label, value, onChange, placeholder, disabled }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition",
          "focus:border-slate-300 focus:ring-4 focus:ring-slate-100",
          disabled && "bg-slate-50 text-slate-500"
        )}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
      />
      <span className={cn("text-sm", disabled ? "text-slate-500" : "text-slate-700")}>
        {label}
      </span>
    </label>
  );
}

export default function Index({ rows = [] }) {
  const page = usePage();
  const role = page.props?.auth?.user?.role || "ENUMERATOR";
  const isAdmin = String(role).toUpperCase() === "ADMIN";

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyActive && !r.is_active) return false;
      if (!qq) return true;
      return (
        String(r.name || "").toLowerCase().includes(qq) ||
        String(r.code || "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q, onlyActive]);

  const columns = useMemo(
    () => [
      {
        key: "code",
        label: "Code",
        render: (r) => (
          <div className="font-mono text-xs text-slate-700">{r.code}</div>
        ),
      },
      {
        key: "name",
        label: "LGU",
        render: (r) => (
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900">{r.name}</div>
            {!r.is_active ? <Badge tone="gray">Inactive</Badge> : null}
          </div>
        ),
      },
      {
        key: "barangays_count",
        label: "Barangays",
        align: "right",
        render: (r) => (
          <div className="text-sm font-semibold text-slate-900">
            {r.barangays_count ?? 0}
          </div>
        ),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (r) => (
          <div className="flex justify-end">
            <Link
              href={`/admin/lgus/${r.id}`}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Open
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const [openCreate, setOpenCreate] = useState(false);

  return (
    <AuthenticatedLayout title="LGUs">
      <div className="space-y-5">
        <PageHeader
          title="LGU Master Data"
          subtitle="LGUs, barangays, and yearly population/area stats used across quantification, submissions, and maps."
          right={
            <button
              type="button"
              onClick={() => {
                console.log("[New LGU] clicked -> openCreate true");
                setOpenCreate(true);
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
            >
              New LGU
            </button>
          }
        />

        <ViewOnlyHint role={role} />

        <FilterBar>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <TextField
                label="Search"
                value={q}
                onChange={setQ}
                placeholder="Search by code or name…"
              />
              <div className="pt-6">
                <Toggle
                  label="Active only"
                  checked={onlyActive}
                  onChange={setOnlyActive}
                />
              </div>
            </div>

            <div className="text-xs text-slate-500">
              {filtered.length} / {rows.length} LGUs
            </div>
          </div>
        </FilterBar>

        {filtered.length ? (
          <DataTable rows={filtered} columns={columns} />
        ) : (
          <EmptyState title="No LGUs found" subtitle="Try adjusting your search or filters." />
        )}
      </div>

      {/* New LGU modal (no-portal, high z-index) */}
      <NewLgu
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        postUrl="/admin/lgus"
        onCreated={() => {
          // optional: place toast here if you have one
        }}
      />
    </AuthenticatedLayout>
  );
}
