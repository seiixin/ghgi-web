import React from "react";
import { Head, Link, useForm } from "@inertiajs/react";

export default function ForgotPassword({ status }) {
  const { data, setData, post, processing, errors } = useForm({ email: "" });

  const submit = (e) => {
    e.preventDefault();
    post("/forgot-password");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head title="Forgot Password" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-200">
          <div className="mb-4">
            <div className="text-xl font-semibold tracking-tight text-slate-900">Reset password</div>
            <div className="mt-1 text-sm text-slate-600">Enter your email and we will send you a password reset link.</div>
          </div>

          {status ? (
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              {status}
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">Email</label>
              <input
                className={[
                  "w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition",
                  errors.email ? "border-rose-300 ring-4 ring-rose-100" : "border-slate-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300"
                ].join(" ")}
                type="email"
                value={data.email}
                onChange={(e) => setData("email", e.target.value)}
                autoComplete="username"
                required
                placeholder="you@example.com"
              />
              {errors.email ? <div className="text-xs text-rose-700">{errors.email}</div> : null}
            </div>

            <button type="submit" disabled={processing} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
              {processing ? "Sending..." : "Send reset link"}
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
