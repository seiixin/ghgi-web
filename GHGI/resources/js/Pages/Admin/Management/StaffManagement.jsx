// resources/js/Pages/Admin/Management/StaffManagement.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthenticatedLayout from "../../../Layouts/AuthenticatedLayout";
import PageHeader from "../../../Components/Shared/PageHeader";

/**
 * routes (based on your route:list):
 *   GET     /admin/staff
 *   POST    /admin/staff
 *   PATCH   /admin/staff/{id}
 *   POST    /admin/staff/{id}/reset-password
 *   DELETE  /admin/staff/{id}         <-- REQUIRED (you added this in controller + routes)
 *
 * Page (Inertia):
 *   /admin/management/staff
 */
const STAFF_API_BASE = "/admin/staff";

// ---------------- helpers ----------------
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

// CSRF sources (Breeze includes meta csrf-token in app layout)
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

// In case your routes are protected by auth:sanctum (SPA), this endpoint sets XSRF-TOKEN cookie
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

/**
 * Generic fetch wrapper
 * - sends both X-CSRF-TOKEN (meta) and X-XSRF-TOKEN (cookie) when available
 * - retries once on 419 after calling /sanctum/csrf-cookie
 */
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
    return fetch(path, {
      credentials: "same-origin",
      ...opts,
      headers: buildHeaders(),
    });
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
      (res.status === 419
        ? "CSRF token missing/expired (419)"
        : "Request failed");
    const e = new Error(msg);
    e.status = res.status;
    e.payload = payload;
    throw e;
  }

  return payload;
}

/**
 * POST form-encoded request with optional method spoofing.
 * This avoids the most common Laravel 419 issues when sending JSON.
 * - Always includes _token from meta csrf token (if present).
 * - For non-POST methods, includes _method=PATCH/PUT/DELETE.
 */
async function apiPostForm(path, dataObj, method = "POST") {
  const csrf = getMetaCsrf();
  const params = new URLSearchParams();

  if (csrf) params.set("_token", csrf);

  const m = String(method || "POST").toUpperCase();
  if (m !== "POST") params.set("_method", m);

  Object.entries(dataObj || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    params.set(k, String(v));
  });

  return apiFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });
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
      panelRef.current
        ?.querySelector("input,select,button,textarea")
        ?.focus?.();
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
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
          ) : null}
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
        <SecondaryButton
          type="button"
          disabled={!canPrev}
          onClick={() => onPage(current - 1)}
        >
          Prev
        </SecondaryButton>
        <SecondaryButton
          type="button"
          disabled={!canNext}
          onClick={() => onPage(current + 1)}
        >
          Next
        </SecondaryButton>
      </div>
    </div>
  );
}

// ---------------- page ----------------
export default function StaffManagement() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [perPage, setPerPage] = useState(15);
  const [page, setPage] = useState(1);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "ADMIN", // UI: only ADMIN (per request)
    status: "active", // UI-only (not sent)
    password: "",
  });

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", status: "" });

  const [resetUser, setResetUser] = useState(null);
  const [resetForm, setResetForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [showResetPw, setShowResetPw] = useState(false);

  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteForm, setDeleteForm] = useState({
    current_password: "",
    confirm_text: "",
  });

  const [lastTempPassword, setLastTempPassword] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
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
    setErr("");
    setOpenEdit(true);
  }

  function openResetModal(u) {
    setResetUser(u);
    setResetForm({
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    });
    setShowResetPw(false);
    setErr("");
    setOpenReset(true);
  }

  function openDeleteModal(u) {
    setDeleteUser(u);
    setDeleteForm({
      current_password: "",
      confirm_text: "",
    });
    setErr("");
    setOpenDelete(true);
  }

  async function onCreateSubmit(e) {
    e.preventDefault();
    setErr("");
    setLastTempPassword("");

    const body = {
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
    };

    // Do NOT send status (backend rejects it)
    if (createForm.password) body.password = createForm.password;

    try {
      const resp = await apiPostForm(STAFF_API_BASE, body, "POST");
      const temp = resp?.temp_password || "";
      setLastTempPassword(temp);

      setToast("User created");
      setOpenCreate(false);
      setCreateForm({
        name: "",
        email: "",
        role: "ADMIN",
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
    if (editForm.name !== "" && editForm.name !== editUser.name)
      body.name = editForm.name;

    // per request: remove ENUMERATOR/REVIEWER options; only allow ADMIN changes in UI
    if (editForm.role && editForm.role !== editUser.role) body.role = editForm.role;

    try {
      await apiPostForm(`${STAFF_API_BASE}/${editUser.id}`, body, "PATCH");
      setToast("User updated");
      setOpenEdit(false);
      setEditUser(null);
      await load();
    } catch (e2) {
      setErr(e2?.message || "Update failed");
    }
  }

  function validateResetForm() {
    const cp = resetForm.current_password || "";
    const np = resetForm.new_password || "";
    const npc = resetForm.new_password_confirmation || "";

    if (!cp || !np || !npc) return "Fill up all password fields.";
    if (np.length < 8) return "New password must be at least 8 characters.";
    if (np !== npc) return "New password confirmation does not match.";
    return "";
  }

  async function onResetPasswordSubmit(e) {
    e.preventDefault();
    if (!resetUser?.id) return;

    setErr("");

    const v = validateResetForm();
    if (v) {
      setErr(v);
      return;
    }

    try {
      await apiPostForm(`${STAFF_API_BASE}/${resetUser.id}/reset-password`, {
        current_password: resetForm.current_password,
        new_password: resetForm.new_password,
        new_password_confirmation: resetForm.new_password_confirmation,
      });

      setToast("Password updated");
      setOpenReset(false);
      setResetUser(null);
      setResetForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setShowResetPw(false);
    } catch (e2) {
      setErr(e2?.message || "Reset failed");
    }
  }

  function validateDeleteForm() {
    if (!deleteForm.current_password) return "Enter your current admin password.";
    if ((deleteForm.confirm_text || "").trim().toUpperCase() !== "DELETE") {
      return 'Type "DELETE" to confirm.';
    }
    return "";
  }

  async function onDeleteSubmit(e) {
    e.preventDefault();
    if (!deleteUser?.id) return;

    setErr("");

    const v = validateDeleteForm();
    if (v) {
      setErr(v);
      return;
    }

    try {
      // Controller expects current_password in body.
      // Use method spoof DELETE via form-encoded.
      await apiPostForm(`${STAFF_API_BASE}/${deleteUser.id}`, {
        current_password: deleteForm.current_password,
      }, "DELETE");

      setToast("User deleted");
      setOpenDelete(false);
      setDeleteUser(null);
      setDeleteForm({ current_password: "", confirm_text: "" });

      // if deleting last item on page, you may want to go back a page
      await load();
    } catch (e2) {
      setErr(e2?.message || "Delete failed");
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
      <PageHeader
        title="Staff Management"
        subtitle="Admin-only user management and role assignments."
      />

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

              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-slate-700">
                  Status (optional)
                </div>
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
                <div className="mt-1 text-xs text-slate-500">
                  Filter only works if backend supports it.
                </div>
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
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {showing.total}
                  </span>
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
                Temporary password (create response)
              </div>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  {lastTempPassword}
                </div>
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
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-slate-600"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-600"
                    >
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {u.name}
                        </div>
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
                          <SecondaryButton
                            type="button"
                            onClick={() => openEditModal(u)}
                          >
                            Edit
                          </SecondaryButton>
                          <DangerButton
                            type="button"
                            onClick={() => openResetModal(u)}
                          >
                            Reset Password
                          </DangerButton>
                          <DangerButton
                            type="button"
                            className="bg-rose-700 hover:bg-rose-800"
                            onClick={() => openDeleteModal(u)}
                          >
                            Delete
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
        <form
          id="create-staff-form"
          onSubmit={onCreateSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Name</div>
              <TextInput
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Full name"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Email</div>
              <TextInput
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((s) => ({ ...s, email: e.target.value }))
                }
                placeholder="email@domain.com"
                required
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Role</div>
              <Select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((s) => ({ ...s, role: e.target.value }))
                }
              >
                {/* per request: removed ENUMERATOR and REVIEWER */}
                <option value="ADMIN">ADMIN</option>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700">
                  Password (optional)
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  onClick={() => {
                    const gen = (len = 12) => {
                      const chars =
                        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
                      let out = "";
                      for (let i = 0; i < len; i++)
                        out += chars[Math.floor(Math.random() * chars.length)];
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
                onChange={(e) =>
                  setCreateForm((s) => ({ ...s, password: e.target.value }))
                }
                placeholder="Leave blank to auto-generate on server"
              />
              <div className="mt-1 text-xs text-slate-500">
                If blank, backend may return{" "}
                <span className="font-semibold">temp_password</span>.
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
          <PrimaryButton
            form="edit-staff-form"
            type="submit"
            disabled={!editUser}
          >
            Save
          </PrimaryButton>
        }
      >
        <form
          id="edit-staff-form"
          onSubmit={onEditSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold text-slate-700">Name</div>
              <TextInput
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">Role</div>
              <Select
                value={editForm.role || ""}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, role: e.target.value }))
                }
              >
                <option value="">(no change)</option>
                {/* per request: removed ENUMERATOR and REVIEWER */}
                <option value="ADMIN">ADMIN</option>
              </Select>
            </div>

          </div>
        </form>
      </Modal>

      {/* Reset modal */}
      <Modal
        open={openReset}
        title="Set New Password"
        subtitle={resetUser ? `Set a new password for ${resetUser.email}` : ""}
        onClose={() => {
          setOpenReset(false);
          setResetUser(null);
          setResetForm({
            current_password: "",
            new_password: "",
            new_password_confirmation: "",
          });
          setShowResetPw(false);
        }}
        footer={
          <DangerButton
            type="submit"
            form="reset-password-form"
            disabled={!resetUser}
          >
            Save Password
          </DangerButton>
        }
      >
        <form
          id="reset-password-form"
          onSubmit={onResetPasswordSubmit}
          className="space-y-4"
        >
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            This will set the selected user's password to the value you enter.
            For confirmation, enter your current admin password.
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-700">
                Your Current Password (Admin)
              </div>
              <TextInput
                type={showResetPw ? "text" : "password"}
                value={resetForm.current_password}
                onChange={(e) =>
                  setResetForm((s) => ({
                    ...s,
                    current_password: e.target.value,
                  }))
                }
                placeholder="Enter your current password"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">
                New Password (for selected user)
              </div>
              <TextInput
                type={showResetPw ? "text" : "password"}
                value={resetForm.new_password}
                onChange={(e) =>
                  setResetForm((s) => ({ ...s, new_password: e.target.value }))
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700">
                Confirm New Password
              </div>
              <TextInput
                type={showResetPw ? "text" : "password"}
                value={resetForm.new_password_confirmation}
                onChange={(e) =>
                  setResetForm((s) => ({
                    ...s,
                    new_password_confirmation: e.target.value,
                  }))
                }
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  checked={showResetPw}
                  onChange={(e) => setShowResetPw(e.target.checked)}
                />
                Show passwords
              </label>

              <button
                type="button"
                className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                onClick={() => {
                  const gen = (len = 12) => {
                    const chars =
                      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
                    let out = "";
                    for (let i = 0; i < len; i++)
                      out += chars[Math.floor(Math.random() * chars.length)];
                    return out;
                  };
                  const pw = gen(12);
                  setResetForm((s) => ({
                    ...s,
                    new_password: pw,
                    new_password_confirmation: pw,
                  }));
                  setShowResetPw(true);
                }}
              >
                Generate new password
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Sent as form data with <code>_token</code> +{" "}
              <code>current_password</code> + <code>new_password</code> +{" "}
              <code>new_password_confirmation</code>.
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={openDelete}
        title="Delete User"
        subtitle={deleteUser ? `Delete ${deleteUser.email} permanently` : ""}
        onClose={() => {
          setOpenDelete(false);
          setDeleteUser(null);
          setDeleteForm({ current_password: "", confirm_text: "" });
        }}
        footer={
          <DangerButton type="submit" form="delete-user-form" disabled={!deleteUser}>
            Delete
          </DangerButton>
        }
      >
        <form id="delete-user-form" onSubmit={onDeleteSubmit} className="space-y-4">
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
            This action is permanent. To proceed, enter your current admin password and type{" "}
            <span className="font-semibold">DELETE</span>.
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">Your Current Password (Admin)</div>
            <TextInput
              type="password"
              value={deleteForm.current_password}
              onChange={(e) => setDeleteForm((s) => ({ ...s, current_password: e.target.value }))}
              placeholder="Enter your current password"
              autoComplete="current-password"
              required
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700">Type DELETE to confirm</div>
            <TextInput
              value={deleteForm.confirm_text}
              onChange={(e) => setDeleteForm((s) => ({ ...s, confirm_text: e.target.value }))}
              placeholder="DELETE"
              required
            />
          </div>

          <div className="text-xs text-slate-500">
            Request: <code>POST</code> with <code>_method=DELETE</code> and <code>current_password</code>.
          </div>
        </form>
      </Modal>
    </AuthenticatedLayout>
  );
}
