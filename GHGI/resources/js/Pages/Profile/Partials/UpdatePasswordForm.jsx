import React from "react";
import { useForm } from "@inertiajs/react";

function Field({ label, value, onChange, autoComplete, error }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <input
        type="password"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className={[
          "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
          error
            ? "border-rose-300 ring-4 ring-rose-100"
            : "border-slate-200 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100",
        ].join(" ")}
      />
      {error ? <div className="text-xs text-rose-700">{error}</div> : null}
    </div>
  );
}

export default function UpdatePasswordForm() {
  const { data, setData, put, processing, errors, reset, recentlySuccessful } = useForm({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const submit = (e) => {
    e.preventDefault();
    put("/password", {
      onSuccess: () => reset("current_password", "password", "password_confirmation"),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Current password"
        value={data.current_password}
        onChange={(e) => setData("current_password", e.target.value)}
        autoComplete="current-password"
        error={errors.current_password}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="New password"
          value={data.password}
          onChange={(e) => setData("password", e.target.value)}
          autoComplete="new-password"
          error={errors.password}
        />
        <Field
          label="Confirm new password"
          value={data.password_confirmation}
          onChange={(e) => setData("password_confirmation", e.target.value)}
          autoComplete="new-password"
          error={errors.password_confirmation}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={processing}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {processing ? "Updating..." : "Update password"}
        </button>

        {recentlySuccessful ? (
          <span className="text-sm text-slate-600">Updated.</span>
        ) : null}
      </div>
    </form>
  );
}
