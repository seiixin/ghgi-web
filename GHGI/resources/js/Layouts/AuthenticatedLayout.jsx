import React from "react";
import { usePage } from "@inertiajs/react";
import Navbar from "../Components/App/Navbar";
import Sidebar from "../Components/App/Sidebar";

export default function AuthenticatedLayout({ title, children }) {
  const { props } = usePage();
  const user = props.auth?.user;
  const appName = props.app?.name ?? "Laguna Inventory";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar appName={appName} user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1">
          <div className="px-8 py-6">
            {title ? (
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
            ) : null}
            <div className={title ? "mt-6" : ""}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
