import React, { useState } from "react";
import { useForm } from "@inertiajs/react";

export default function DeleteUserForm() {
  const [confirm, setConfirm] = useState(false);

  const { data, setData, delete: destroy, processing, errors, reset } = useForm({
    password: "",
  });

  const submit = (e) => {
    e.preventDefault();
    destroy("/profile", {
      onSuccess: () => {
        reset();
        setConfirm(false);
      },
    });
  };

  if (!confirm) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-slate-600">
          Once your account is deleted, all of its resources and data will be permanently deleted.
        </div>
        <button
          type="button"
          className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          onClick={() => setConfirm(true)}
        >
          Delete account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
        Please confirm your password to delete your account.
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-800">Password</label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => setData("password", e.target.value)}
          autoComplete="current-password"
          className={[
            "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
            errors.password
              ? "border-rose-300 ring-4 ring-rose-100"
              : "border-slate-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-100",
          ].join(" ")}
          required
        />
        {errors.password ? <div className="text-xs text-rose-700">{errors.password}</div> : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={processing}
          className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {processing ? "Deleting..." : "Confirm delete"}
        </button>

        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            reset();
            setConfirm(false);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
