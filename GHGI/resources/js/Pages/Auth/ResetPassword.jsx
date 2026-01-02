import React from "react";
import { Head, Link, useForm } from "@inertiajs/react";

function Field({ label, type="text", value, onChange, required, placeholder, error }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <input
        className={[
          "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
          error ? "border-rose-300 ring-4 ring-rose-100" : "border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
        ].join(" ")}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
      {error ? <div className="text-xs text-rose-700">{error}</div> : null}
    </div>
  );
}

export default function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email: email || "",
    password: "",
    password_confirmation: "",
  });

  const submit = (e) => {
    e.preventDefault();
    post("/reset-password", { onFinish: () => reset("password", "password_confirmation") });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head title="Reset Password" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-200">
          <div className="mb-4">
            <div className="text-xl font-semibold tracking-tight text-slate-900">Set new password</div>
            <div className="mt-1 text-sm text-slate-600">Choose a new password for your account.</div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" type="email" value={data.email} onChange={(e) => setData("email", e.target.value)} required placeholder="you@example.com" error={errors.email} />
            <Field label="New password" type="password" value={data.password} onChange={(e) => setData("password", e.target.value)} required placeholder="••••••••" error={errors.password} />
            <Field label="Confirm password" type="password" value={data.password_confirmation} onChange={(e) => setData("password_confirmation", e.target.value)} required placeholder="••••••••" error={errors.password_confirmation} />

            <button type="submit" disabled={processing} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
              {processing ? "Saving..." : "Save password"}
            </button>

            <div className="text-sm">
              <Link href="/login" className="text-slate-600 hover:text-slate-900">Back to login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
