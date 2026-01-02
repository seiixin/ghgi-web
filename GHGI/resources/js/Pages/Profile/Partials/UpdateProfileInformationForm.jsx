import React from "react";
import { Link, useForm } from "@inertiajs/react";

function Field({ label, type = "text", value, onChange, autoComplete, error }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <input
        type={type}
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

export default function UpdateProfileInformationForm({
  mustVerifyEmail,
  status,
  user,
}) {
  const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });

  const submit = (e) => {
    e.preventDefault();
    patch("/profile");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {status === "profile-updated" ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Profile updated.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Full name"
          value={data.name}
          onChange={(e) => setData("name", e.target.value)}
          autoComplete="name"
          error={errors.name}
        />
        <Field
          label="Email"
          type="email"
          value={data.email}
          onChange={(e) => setData("email", e.target.value)}
          autoComplete="username"
          error={errors.email}
        />
      </div>

      {mustVerifyEmail && user && user.email_verified_at === null ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <div>Your email address is unverified.</div>
          <div className="mt-2">
            <Link
              href="/email/verification-notification"
              method="post"
              as="button"
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Resend verification email
            </Link>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={processing}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {processing ? "Saving..." : "Save changes"}
        </button>

        {recentlySuccessful ? (
          <span className="text-sm text-slate-600">Saved.</span>
        ) : null}
      </div>
    </form>
  );
}
