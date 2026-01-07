import React from "react";
import { usePage } from "@inertiajs/react";
import Navbar from "../Components/App/Navbar";
import Sidebar from "../Components/App/Sidebar";

export default function AuthenticatedLayout({ title, children }) {
  const { props } = usePage();
  const user = props.auth?.user;
  const appName = props.app?.name ?? "Laguna Inventory";

  // Adjust mo ito kung iba ang actual height ng Navbar mo
  const NAVBAR_H = 64; // px (h-16)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar appName={appName} user={user} />

      <div className="flex relative z-0">
        {/* Sticky sidebar wrapper */}
        <aside
          className="shrink-0 z-10"
          style={{ width: 300 }} // optional: remove if Sidebar already has its own width
        >
          <div
            className="sticky"
            style={{
              top: NAVBAR_H,
              height: `calc(100vh - ${NAVBAR_H}px)`,
              overflowY: "auto",
            }}
          >
            <Sidebar user={user} />
          </div>
        </aside>

        <main className="relative z-20 flex-1 min-w-0">
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
