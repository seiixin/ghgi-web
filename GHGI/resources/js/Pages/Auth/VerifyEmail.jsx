import React from "react";
import { Head, Link, useForm } from "@inertiajs/react";

export default function VerifyEmail({ status }) {
  const { post, processing } = useForm({});

  const submit = (e) => {
    e.preventDefault();
    post("/email/verification-notification");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head title="Verify Email" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-200">
          <div className="mb-4">
            <div className="text-xl font-semibold tracking-tight text-slate-900">Verify your email</div>
            <div className="mt-1 text-sm text-slate-600">Please verify your email address by clicking the link we sent to you.</div>
          </div>

          {status === "verification-link-sent" ? (
            <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              A new verification link has been sent to your email address.
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-3">
            <button type="submit" disabled={processing} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
              {processing ? "Sending..." : "Resend verification email"}
            </button>

            <Link href="/logout" method="post" as="button" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Log out
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
