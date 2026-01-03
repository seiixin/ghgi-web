import React, { useMemo, useState, useEffect } from "react";
import { Link, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";
import Badge from "../../../Components/Shared/Badge";
import ViewOnlyHint from "../../../Components/MasterData/ViewOnlyHint";

import EditLgu from "../../../Components/MasterData/EditLgu";
import AddBarangay from "../../../Components/MasterData/AddBarangay";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Local, no-portal modal to avoid "nothing shows" issues.
 * Used for the remaining inline dialogs on this page.
 */
function SimpleModal({ title, open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Close modal backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-slate-900 text-white"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function TextField({ label, value, onChange, placeholder, disabled, type = "text" }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>
      <input
        type={type}
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

function RowCard({ title, right, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function Show({ lgu, barangays = [], stats = [] }) {
  const page = usePage();
  const role = page.props?.auth?.user?.role || "ENUMERATOR";
  const isAdmin = String(role).toUpperCase() === "ADMIN";

  const [tab, setTab] = useState("barangays"); // 'barangays' | 'stats'

  // Edit LGU (component modal)
  const [openEditLgu, setOpenEditLgu] = useState(false);

  // Add barangay (component modal)
  const [openAddBarangay, setOpenAddBarangay] = useState(false);

  // Edit barangay (inline modal)
  const [editBarangayTarget, setEditBarangayTarget] = useState(null);
  const editBarangay = useForm({
    name: "",
    is_active: true,
  });

  function openEditBarangay(b) {
    setEditBarangayTarget(b);
    editBarangay.setData({
      name: b.name || "",
      is_active: !!b.is_active,
    });
  }

  function submitEditBarangay(e) {
    e.preventDefault();
    if (!editBarangayTarget) return;
    editBarangay.patch(`/admin/barangays/${editBarangayTarget.id}`, {
      preserveScroll: true,
      onSuccess: () => setEditBarangayTarget(null),
    });
  }

  // Add/Upsert stats (inline modal)
  const [openAddStat, setOpenAddStat] = useState(false);
  const addStat = useForm({
    year: "",
    population: "",
    area_km2: "",
  });

  function submitAddStat(e) {
    e.preventDefault();
    addStat.post(`/admin/lgus/${lgu.id}/stats`, {
      preserveScroll: true,
      onSuccess: () => {
        addStat.reset();
        setOpenAddStat(false);
      },
    });
  }

  // Edit stat (inline modal)
  const [editStatTarget, setEditStatTarget] = useState(null);
  const editStat = useForm({
    population: "",
    area_km2: "",
  });

  function openEditStat(s) {
    setEditStatTarget(s);
    editStat.setData({
      population: s.population ?? "",
      area_km2: s.area_km2 ?? "",
    });
  }

  function submitEditStat(e) {
    e.preventDefault();
    if (!editStatTarget) return;
    editStat.patch(`/admin/lgu-stats/${editStatTarget.id}`, {
      preserveScroll: true,
      onSuccess: () => setEditStatTarget(null),
    });
  }

  const barangayRows = useMemo(
    () => barangays.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [barangays]
  );
  const statRows = useMemo(
    () => stats.slice().sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    [stats]
  );

  return (
    <AuthenticatedLayout title={`LGU - ${lgu?.name || ""}`}>
      <div className="space-y-5">
        <PageHeader
          title={lgu?.name || "LGU"}
          subtitle={
            <span className="text-slate-600">
              <span className="font-mono text-xs">{lgu?.code}</span>{" "}
              {!lgu?.is_active ? <Badge tone="gray">Inactive</Badge> : null}
            </span>
          }
          left={
            <Link
              href="/admin/lgus"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition"
            >
              Back
            </Link>
          }
          right={
            isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  console.log("[Edit LGU] clicked -> openEditLgu true");
                  setOpenEditLgu(true);
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Edit LGU
              </button>
            ) : null
          }
        />

        <ViewOnlyHint role={role} />

        <div className="flex flex-wrap items-center gap-2">
          <TabButton active={tab === "barangays"} onClick={() => setTab("barangays")}>
            Barangays
          </TabButton>
          <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
            Population / Area
          </TabButton>
        </div>

        {tab === "barangays" ? (
          <RowCard
            title={`Barangays (${barangayRows.length})`}
            right={
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    console.log("[Add Barangay] clicked -> openAddBarangay true");
                    setOpenAddBarangay(true);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
                >
                  Add Barangay
                </button>
              ) : null
            }
          >
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
              {barangayRows.length ? (
                barangayRows.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{b.name}</div>
                      <div className="text-xs text-slate-500">
                        {b.is_active ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!b.is_active ? <Badge tone="gray">Inactive</Badge> : null}
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => openEditBarangay(b)}
                          className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white px-4 py-6 text-sm text-slate-600">No barangays yet.</div>
              )}
            </div>
          </RowCard>
        ) : (
          <RowCard
            title={`Year Stats (${statRows.length})`}
            right={
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => setOpenAddStat(true)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
                >
                  Add / Upsert Year
                </button>
              ) : null
            }
          >
            <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
              <table className="min-w-full bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3 text-right">Population</th>
                    <th className="px-4 py-3 text-right">Area (km²)</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statRows.length ? (
                    statRows.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.year}</td>
                        <td className="px-4 py-3 text-right text-slate-800">
                          {s.population ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-800">
                          {s.area_km2 ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => openEditStat(s)}
                              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition"
                            >
                              Edit
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-600">
                        No year stats yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </RowCard>
        )}
      </div>

      {/* Component modals (no-portal, high z-index) */}
      <EditLgu
        open={openEditLgu}
        onClose={() => setOpenEditLgu(false)}
        lgu={lgu}
        patchUrl={`/admin/lgus/${lgu.id}`}
      />

      <AddBarangay
        open={openAddBarangay}
        onClose={() => setOpenAddBarangay(false)}
        lguId={lgu.id}
        postUrl={`/admin/lgus/${lgu.id}/barangays`}
      />

      {/* Inline modals converted to SimpleModal to avoid portal issues */}
      <SimpleModal
        title="Edit Barangay"
        open={!!editBarangayTarget}
        onClose={() => setEditBarangayTarget(null)}
      >
        <form onSubmit={submitEditBarangay} className="space-y-4">
          <TextField
            label="Barangay name"
            value={editBarangay.data.name}
            onChange={(v) => editBarangay.setData("name", v)}
            disabled={!isAdmin}
          />
          <div className="pt-1">
            <Toggle
              label="Active"
              checked={!!editBarangay.data.is_active}
              onChange={(v) => editBarangay.setData("is_active", v)}
              disabled={!isAdmin}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditBarangayTarget(null)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editBarangay.processing || !isAdmin}
              className={cn(
                "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition",
                editBarangay.processing ? "opacity-60" : "hover:bg-slate-800",
                !isAdmin && "opacity-40 cursor-not-allowed"
              )}
            >
              Save
            </button>
          </div>
        </form>
      </SimpleModal>

      <SimpleModal
        title="Add / Upsert Year Stats"
        open={openAddStat}
        onClose={() => setOpenAddStat(false)}
      >
        <form onSubmit={submitAddStat} className="space-y-4">
          <TextField
            label="Year"
            type="number"
            value={addStat.data.year}
            onChange={(v) => addStat.setData("year", v)}
            placeholder="e.g. 2023"
            disabled={!isAdmin}
          />
          <TextField
            label="Population"
            type="number"
            value={addStat.data.population}
            onChange={(v) => addStat.setData("population", v)}
            placeholder="e.g. 1000000"
            disabled={!isAdmin}
          />
          <TextField
            label="Area (km²)"
            type="number"
            value={addStat.data.area_km2}
            onChange={(v) => addStat.setData("area_km2", v)}
            placeholder="e.g. 1759.000"
            disabled={!isAdmin}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenAddStat(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addStat.processing || !isAdmin}
              className={cn(
                "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition",
                addStat.processing ? "opacity-60" : "hover:bg-slate-800",
                !isAdmin && "opacity-40 cursor-not-allowed"
              )}
            >
              Save
            </button>
          </div>
        </form>
      </SimpleModal>

      <SimpleModal
        title={editStatTarget ? `Edit Year ${editStatTarget.year}` : "Edit Year"}
        open={!!editStatTarget}
        onClose={() => setEditStatTarget(null)}
      >
        <form onSubmit={submitEditStat} className="space-y-4">
          <TextField
            label="Population"
            type="number"
            value={editStat.data.population}
            onChange={(v) => editStat.setData("population", v)}
            disabled={!isAdmin}
          />
          <TextField
            label="Area (km²)"
            type="number"
            value={editStat.data.area_km2}
            onChange={(v) => editStat.setData("area_km2", v)}
            disabled={!isAdmin}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditStatTarget(null)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editStat.processing || !isAdmin}
              className={cn(
                "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition",
                editStat.processing ? "opacity-60" : "hover:bg-slate-800",
                !isAdmin && "opacity-40 cursor-not-allowed"
              )}
            >
              Save
            </button>
          </div>
        </form>
      </SimpleModal>
    </AuthenticatedLayout>
  );
}
