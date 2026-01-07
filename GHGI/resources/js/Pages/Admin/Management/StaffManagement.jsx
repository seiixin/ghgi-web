import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

const STAFF_API_BASE = "/admin/staff";

// --- helpers ---
async function readJsonOrText(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const t = await res.text();
  return { message: t };
}

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function formatIso(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function roleLabel(role) {
  const r = String(role || "").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "ENUMERATOR") return "ENUMERATOR";
  if (r === "REVIEWER") return "REVIEWER";
  return r || "—";
}

function getMetaCsrf() {
  const el = document.querySelector('meta[name="csrf-token"]');
  return el?.getAttribute("content") || "";
}

function getCookie(name) {
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

function getXsrfFromCookie() {
  const raw = getCookie("XSRF-TOKEN");
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function ensureCsrfCookie() {
  await fetch("/sanctum/csrf-cookie", {
    method: "GET",
    credentials: "same-origin",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
  });
}

async function apiFetch(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const buildHeaders = () => {
    const meta = getMetaCsrf();
    const xsrf = getXsrfFromCookie();
    return {
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
      ...(isWrite && meta ? { "X-CSRF-TOKEN": meta } : {}),
      ...(isWrite && xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
      ...(opts.headers || {}),
    };
  };

  const doFetch = async () => {
    const res = await fetch(path, {
      credentials: "same-origin",
      ...opts,
      headers: buildHeaders(),
    });
    return res;
  };

  let res = await doFetch();
  if (res.status === 419 && isWrite) {
    await ensureCsrfCookie();
    res = await doFetch();
  }

  const payload = await readJsonOrText(res);

  if (!res.ok) {
    const msg =
      payload?.message ||
      payload?.error ||
      (res.status === 419 ? "CSRF token missing/expired (419)" : "Request failed");
    const e = new Error(msg);
    e.status = res.status;
    e.payload = payload;
    throw e;
  }

  return payload;
}

function StatusPill({ value }) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  const isActive = v === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {v}
    </span>
  );
}

function PrimaryButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}

function TextInput({ className, ...props }) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100",
        className
      )}
    />
  );
}

function Select({ className, children, ...props }) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100",
        className
      )}
    >
      {children}
    </select>
  );
}

function Modal({ open, title, subtitle, children, footer, onClose }) {
  const panelRef = useRef(null);

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
    setTimeout(() => {
      panelRef.current?.querySelector("input,select,button,textarea")?.focus?.();
    }, 0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-slate-900/40 p-4">
      <div
        ref={panelRef}
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        <div className="border-b border-slate-100 p-5">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
        </div>
        <div className="p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-5">
          {footer}
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function Pagination({ meta, onPage }) {
  if (!meta) return null;
  const current = meta.current_page || 1;
  const last = meta.last_page || 1;

  const canPrev = current > 1;
  const canNext = current < last;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-slate-600">
        Page <span className="font-semibold text-slate-900">{current}</span> of{" "}
        <span className="font-semibold text-slate-900">{last}</span> • Total{" "}
        <span className="font-semibold text-slate-900">{meta.total ?? 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <SecondaryButton type="button" disabled={!canPrev} onClick={() => onPage(current - 1)}>
          Prev
        </SecondaryButton>
        <SecondaryButton type="button" disabled={!canNext} onClick={() => onPage(current + 1)}>
          Next
        </SecondaryButton>
      </div>
    </div>
  );
}

export default function StaffManagement() {
  // data
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState(""); // UI-only unless backend supports it
  const [perPage, setPerPage] = useState(15);
  const [page, setPage] = useState(1);

  // modals
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReset, setOpenReset] = useState(false);

  // forms
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "ENUMERATOR",
    status: "active", // UI-only, will NOT be sent
    password: "",
  });

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", status: "" }); // status UI-only
  const [resetUser, setResetUser] = useState(null);

  // password display (global + modal)
  const [lastTempPassword, setLastTempPassword] = useState("");
  const [resetTempPassword, setResetTempPassword] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);

    // IMPORTANT: only include status in query if backend supports it.
    // If backend rejects it, comment next two lines.
    if (status) p.set("status", status);

    p.set("page", String(page));
    p.set("per_page", String(perPage));
    return p.toString();
  }, [q, role, status, page, perPage]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiFetch(`${STAFF_API_BASE}?${queryString}`);

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.data)
        ? data.data.data
        : [];

      const m =
        data?.meta ||
        data?.data?.meta || {
          current_page: data?.current_page,
          last_page: data?.last_page,
          per_page: data?.per_page,
          total: data?.total,
        };

      setRows(list);
      setMeta(m);
    } catch (e) {
      setErr(e?.message || "Failed to load staff");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // make sure CSRF cookie exists early (helps avoid first-write 419)
    ensureCsrfCookie().catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function openEditModal(u) {
    setEditUser(u);
    setEditForm({
      name: u?.name || "",
      role: u?.role || "",
      status: u?.status || "",
    });
    setOpenEdit(true);
  }

  function openResetModal(u) {
    setResetUser(u);
    setResetTempPassword("");
    setErr("");
    setOpenReset(true);
  }

  async function onCreateSubmit(e) {
    e.preventDefault();
    setErr("");
    setLastTempPassword("");

    // IMPORTANT: do NOT send status unless backend supports it (yours rejects it).
    const body = {
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
    };
    if (createForm.password) body.password = createForm.password;

    try {
      const resp = await apiFetch(STAFF_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const temp = resp?.temp_password || "";
      setLastTempPassword(temp);
      setToast("User created");
      setOpenCreate(false);
      setCreateForm({
        name: "",
        email: "",
        role: "ENUMERATOR",
        status: "active",
        password: "",
      });

      await load();
    } catch (e2) {
      setErr(e2?.message || "Create failed");
    }
  }

  async function onEditSubmit(e) {
    e.preventDefault();
    if (!editUser?.id) return;
    setErr("");

    const body = {};
    if (editForm.name !== "" && editForm.name !== editUser.name) body.name = editForm.name;
    if (editForm.role && editForm.role !== editUser.role) body.role = editForm.role;

    // IMPORTANT: do NOT send status unless backend supports it
    // if (editForm.status !== "" && editForm.status !== editUser.status) body.status = editForm.status;

    try {
      await apiFetch(`${STAFF_API_BASE}/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setToast("User updated");
      setOpenEdit(false);
      setEditUser(null);
      await load();
    } catch (e2) {
      setErr(e2?.message || "Update failed");
    }
  }

  async function onResetPassword() {
    if (!resetUser?.id) return;
    setErr("");
    setResetTempPassword("");
    setLastTempPassword("");

    try {
      const resp = await apiFetch(`${STAFF_API_BASE}/${resetUser.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const temp = resp?.temp_password || "";
      setResetTempPassword(temp);     // show inside modal
      setLastTempPassword(temp);      // also show in top panel
      setToast("Password reset");
    } catch (e2) {
      setErr(e2?.message || "Reset failed");
    }
  }

  const showing = useMemo(() => {
    const total = meta?.total ?? rows.length;
    const start =
      total === 0
        ? 0
        : meta?.current_page
        ? (meta.current_page - 1) * (meta.per_page || perPage) + 1
        : 1;
    const end = meta?.current_page
      ? Math.min(start + (meta.per_page || perPage) - 1, total)
      : Math.min(rows.length, total);
    return { total, start, end };
  }, [meta, rows.length, perPage]);

  return (
    <AuthenticatedLayout title="Staff Management">
      <PageHeader title="Staff Management" subtitle="Admin-only user management and role assignments." />

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-slate-700">Search</div>
                <TextInput
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Search by name or email…"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700">Role</div>
                <Select
                  value={role}
                  onChange={(e) => {
                    setPage(1);
                    setRole(e.target.value);
                  }}
                >
                  <option value="">All</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="ENUMERATOR">ENUMERATOR</option>
                  <option value="REVIEWER">REVIEWER</option>
                </Select>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700">Per page</div>
                <Select
                  value={perPage}
                  onChange={(e) => {
                    setPage(1);
                    setPerPage(parseInt(e.target.value || "15", 10));
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </Select>
              </div>

              {/* UI-only: remove status filter if backend rejects query param */}
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-slate-700">Status (optional)</div>
                <Select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value);
                  }}
                >
                  <option value="">All</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setQ("");
                    setRole("");
                    setStatus("");
                    setPerPage(15);
                    setPage(1);
                  }}
                >
                  Reset
                </SecondaryButton>

                <PrimaryButton
                  type="button"
                  onClick={() => {
                    setErr("");
                    setLastTempPassword("");
                    setOpenCreate(true);
                  }}
                >
                  Create User
                </PrimaryButton>
              </div>
            </div>

            <div className="text-xs text-slate-600">
              {loading ? (
                <span className="font-semibold text-slate-900">Loading…</span>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {showing.start}-{showing.end}
                  </span>{" "}
                  of <span className="font-semibold text-slate-900">{showing.total}</span>
                </>
              )}
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {err}
            </div>
          ) : null}

          {toast ? (
            <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
              {toast}
            </div>
          ) : null}

          {lastTempPassword ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Temporary password
              </div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-slate-900">{lastTempPassword}</div>
                <SecondaryButton
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(lastTempPassword);
                      setToast("Copied");
                    } catch {
                      setToast("Copy failed");
                    }
                  }}
                >
                  Copy
                </SecondaryButton>
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Name
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Email
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Role
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Created
                  </th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-600">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-600">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">ID: {u.id}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                        {u.email}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <StatusPill value={u.status} />
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600">
                        {formatIso(u.created_at)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <SecondaryButton type="button" onClick={() => openEditModal(u)}>
                            Edit
                          </SecondaryButton>
                          <DangerButton type="button" onClick={() => openResetModal(u)}>
                            Reset Password
                          </DangerButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 p-4">
            <Pagination meta={meta} onPage={(p) => setPage(p)} />
          </div>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={openCreate}
        title="Create Staff User"
        subtitle="Creates a new user and assigns a role."
        onClose={() => setOpenCreate(false)}
        footer={
          <PrimaryButton form="create-staff-form" type="submit">
            Create
          </PrimaryButton>
        }
      >
        <form id="create-staff-form" onSubmit={onCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Name</div>
              <TextInput
                value={createForm.name}
                onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Full name"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Email</div>
              <TextInput
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="email@domain.com"
                required
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Role</div>
              <Select
                value={createForm.role}
                onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value }))}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="ENUMERATOR">ENUMERATOR</option>
                <option value="REVIEWER">REVIEWER</option>
              </Select>
            </div>

            {/* UI-only status (not sent) */}
            <div>
              <div className="text-xs font-semibold text-slate-700">Status (UI-only)</div>
              <Select
                value={createForm.status}
                onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </Select>
              <div className="mt-1 text-xs text-slate-500">Not saved (backend has no status).</div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">Password (optional)</div>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  onClick={() => {
                    const gen = (len = 12) => {
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
                      let out = "";
                      for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
                      return out;
                    };
                    setCreateForm((s) => ({ ...s, password: gen(12) }));
                  }}
                >
                  Generate
                </button>
              </div>
              <TextInput
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="Leave blank to auto-generate on server"
              />
              <div className="mt-1 text-xs text-slate-500">
                If blank, backend returns <span className="font-semibold">temp_password</span>.
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={openEdit}
        title="Edit Staff User"
        subtitle={editUser ? `Update role/name for ${editUser.email}` : ""}
        onClose={() => {
          setOpenEdit(false);
          setEditUser(null);
        }}
        footer={
          <PrimaryButton form="edit-staff-form" type="submit" disabled={!editUser}>
            Save
          </PrimaryButton>
        }
      >
        <form id="edit-staff-form" onSubmit={onEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Name</div>
              <TextInput
                value={editForm.name}
                onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Role</div>
              <Select
                value={editForm.role || ""}
                onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}
              >
                <option value="">(no change)</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ENUMERATOR">ENUMERATOR</option>
                <option value="REVIEWER">REVIEWER</option>
              </Select>
            </div>

            {/* UI-only status, not saved */}
            <div>
              <div className="text-xs font-semibold text-slate-700">Status (UI-only)</div>
              <Select
                value={editForm.status ?? ""}
                onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="">(no change)</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </Select>
              <div className="mt-1 text-xs text-slate-500">Not saved (backend has no status).</div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Reset modal */}
      <Modal
        open={openReset}
        title="Reset Password"
        subtitle={resetUser ? `Generate a new temporary password for ${resetUser.email}` : ""}
        onClose={() => {
          setOpenReset(false);
          setResetUser(null);
          setResetTempPassword("");
        }}
        footer={
          <DangerButton type="button" onClick={onResetPassword} disabled={!resetUser}>
            Generate New Password
          </DangerButton>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            This generates a new temporary password (admin action). The user will need it to log in.
          </div>

          {resetTempPassword ? (
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                New temporary password
              </div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-slate-900">{resetTempPassword}</div>
                <SecondaryButton
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resetTempPassword);
                      setToast("Copied");
                    } catch {
                      setToast("Copy failed");
                    }
                  }}
                >
                  Copy
                </SecondaryButton>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
              Click <span className="font-semibold">Generate New Password</span> to create and reveal the password here.
            </div>
          )}
        </div>
      </Modal>
    </AuthenticatedLayout>
  );
}
