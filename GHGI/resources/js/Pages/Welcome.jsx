// resources/js/Pages/Welcome.jsx
import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";

export default function Welcome() {
  const { props } = usePage();

  const user = props?.auth?.user ?? null;
  const canLogin = !!props?.canLogin;
  const canRegister = !!props?.canRegister;

  return (
    <div className="min-h-screen bg-slate-50">
      <Head title="Welcome" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-200">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600/15 ring-1 ring-emerald-500/30">
              <div className="h-5 w-5 rounded bg-emerald-500/80" />
            </div>
            <div className="leading-tight">
              <div className="text-xs tracking-widest text-slate-500">COMMUNITY GHG</div>
              <div className="text-sm font-semibold text-slate-900">Laguna Inventory</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-2xl font-semibold tracking-tight text-slate-900">
              GHGI Laguna Inventory
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Community-level greenhouse gas inventory dashboard.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                {canLogin ? (
                  <Link
                    href="/login"
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Sign in
                  </Link>
                ) : null}

                {canRegister ? (
                  <Link
                    href="/register"
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Create account
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
