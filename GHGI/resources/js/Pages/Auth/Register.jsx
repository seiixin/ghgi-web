import React from "react";
import { Head, Link, useForm } from "@inertiajs/react";

function Field({ label, type="text", name, value, onChange, autoComplete, required, placeholder, error }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <input
        className={[
          "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
          error ? "border-rose-300 ring-4 ring-rose-100" : "border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
        ].join(" ")}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
      />
      {error ? <div className="text-xs text-rose-700">{error}</div> : null}
    </div>
  );
}

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const submit = (e) => {
    e.preventDefault();
    post("/register", { onFinish: () => reset("password", "password_confirmation") });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head title="Register" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-200">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600/15 ring-1 ring-emerald-500/30">
              <div className="h-5 w-5 rounded bg-emerald-500/80" />
            </div>
            <div className="leading-tight">
              <div className="text-xs tracking-widest text-slate-500">COMMUNITY GHG</div>
              <div className="text-sm font-semibold text-slate-900">Laguna Inventory</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xl font-semibold tracking-tight text-slate-900">Create account</div>
            <div className="mt-1 text-sm text-slate-600">Register a new account to access the platform.</div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name" name="name" value={data.name} onChange={(e) => setData("name", e.target.value)} autoComplete="name" required placeholder="Juan Dela Cruz" error={errors.name} />
            <Field label="Email" type="email" name="email" value={data.email} onChange={(e) => setData("email", e.target.value)} autoComplete="username" required placeholder="you@example.com" error={errors.email} />
            <Field label="Password" type="password" name="password" value={data.password} onChange={(e) => setData("password", e.target.value)} autoComplete="new-password" required placeholder="••••••••" error={errors.password} />
            <Field label="Confirm password" type="password" name="password_confirmation" value={data.password_confirmation} onChange={(e) => setData("password_confirmation", e.target.value)} autoComplete="new-password" required placeholder="••••••••" error={errors.password_confirmation} />

            <button type="submit" disabled={processing} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
              {processing ? "Creating..." : "Create account"}
            </button>

            <div className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
