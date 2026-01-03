// GHGI/resources/js/Components/MasterData/NewLgu.jsx
import React, { useEffect } from "react";
import { useForm, usePage } from "@inertiajs/react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Local, no-portal modal to avoid "nothing shows" issues.
 * Renders at document level with very high z-index.
 */
function SimpleModal({ title, open, onClose, children }) {
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // lock scroll when open
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

function TextField({ label, value, onChange, placeholder, disabled, name }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>
      <input
        name={name}
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

function Toggle({ label, checked, onChange, disabled, name }) {
  return (
    <label className="flex items-center gap-3">
      <input
        name={name}
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

/**
 * New LGU modal component (self-contained).
 *
 * Usage:
 * <NewLgu open={openCreate} onClose={() => setOpenCreate(false)} />
 */
export default function NewLgu({
  open,
  onClose,
  postUrl = "/admin/lgus",
  onCreated,
}) {
  const page = usePage();
  const role = page.props?.auth?.user?.role || "ENUMERATOR";
  const isAdmin = String(role).toUpperCase() === "ADMIN";

  const form = useForm({
    code: "",
    name: "",
    is_active: true,
  });

  function closeAndReset() {
    form.clearErrors();
    form.reset();
    onClose?.();
  }

  function submit(e) {
    e.preventDefault();
    if (!isAdmin) return;

    form.post(postUrl, {
      preserveScroll: true,
      onSuccess: () => {
        form.reset();
        onClose?.();
        onCreated?.();
      },
    });
  }

  // reset when opening fresh
  useEffect(() => {
    if (!open) return;
    form.clearErrors();
  }, [open]);

  return (
    <SimpleModal title="Create LGU" open={!!open} onClose={closeAndReset}>
      {!isAdmin ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          View-only role: ADMIN access required to create LGU.
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <TextField
          label="Code"
          name="code"
          value={form.data.code}
          onChange={(v) => form.setData("code", v)}
          placeholder="e.g. LAGUNA_DEMO"
          disabled={!isAdmin || form.processing}
        />

        <TextField
          label="Name"
          name="name"
          value={form.data.name}
          onChange={(v) => form.setData("name", v)}
          placeholder="e.g. Laguna (Demo)"
          disabled={!isAdmin || form.processing}
        />

        <div className="pt-1">
          <Toggle
            label="Active"
            name="is_active"
            checked={!!form.data.is_active}
            onChange={(v) => form.setData("is_active", v)}
            disabled={!isAdmin || form.processing}
          />
        </div>

        {form.errors?.code ? (
          <div className="text-sm text-rose-700">{form.errors.code}</div>
        ) : null}
        {form.errors?.name ? (
          <div className="text-sm text-rose-700">{form.errors.name}</div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={closeAndReset}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            disabled={form.processing}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={form.processing || !isAdmin}
            className={cn(
              "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition",
              form.processing ? "opacity-60" : "hover:bg-slate-800",
              !isAdmin && "opacity-40 cursor-not-allowed"
            )}
          >
            {form.processing ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}
