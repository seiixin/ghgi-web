import React, { useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import Badge from "../Shared/Badge";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function MenuItem({ href, children, method, danger, onClick }) {
  const base = "block w-full rounded-xl px-3 py-2 text-left text-sm transition";
  const cls = danger
    ? cn(base, "text-rose-700 hover:bg-rose-50")
    : cn(base, "text-slate-700 hover:bg-slate-50");

  if (method) {
    return (
      <Link href={href} method={method} as="button" type="button" className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <Link href={href} className={cls} onClick={onClick}>
      {children}
    </Link>
  );
}

export default function Navbar({ appName = "Laguna Inventory", user }) {
  const [open, setOpen] = useState(false);

  const initials = useMemo(() => {
    const name = (user?.name || "User").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]).join("");
    return (letters || "U").toUpperCase();
  }, [user]);

  const role = (user?.role || "ENUMERATOR").toUpperCase();
  const isAdmin = role === "ADMIN";

  const adminMenu = [
    { href: "/admin/management/forms", label: "Forms" },
    { href: "/admin/management/quantification-settings", label: "Quantification Settings" },
    { href: "/admin/management/emission-settings", label: "Emission Settings" },
    { href: "/admin/management/staff", label: "Staff Management" },
    { href: "/admin/management/layers", label: "Layers Settings" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/30">
            <div className="h-5 w-5 rounded bg-emerald-500/80" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] tracking-widest text-slate-300">COMMUNITY GHG</div>
            <div className="text-sm font-semibold text-white">{appName}</div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-full bg-slate-800/60 px-3 py-1.5 ring-1 ring-slate-700 hover:bg-slate-800/75 transition"
            aria-haspopup="menu"
            aria-expanded={open ? "true" : "false"}
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {initials}
            </div>

            <div className="hidden sm:block text-left leading-tight">
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-white">{user?.name ?? "User"}</div>
                <span className="text-slate-300 text-xs">▾</span>
              </div>

              <div className="mt-0.5 flex items-center gap-2">
                <Badge tone={isAdmin ? "green" : "blue"}>{role}</Badge>
                <span className="text-[11px] text-slate-300">
                  {isAdmin ? "System Administrator" : "Enumerator"}
                </span>
              </div>
            </div>
          </button>

          {open ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              />
              <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] ring-1 ring-slate-200">
                <div className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{user?.name ?? "User"}</div>
                  <div className="text-xs text-slate-600">{user?.email ?? ""}</div>
                </div>
                <div className="border-t border-slate-100" />

                <div className="p-2 space-y-1">
                  <MenuItem href="/profile" onClick={() => setOpen(false)}>Profile</MenuItem>

                  {isAdmin ? (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      {adminMenu.map((it) => (
                        <MenuItem key={it.href} href={it.href} onClick={() => setOpen(false)}>
                          {it.label}
                        </MenuItem>
                      ))}
                    </>
                  ) : null}

                  <div className="pt-1">
                    <MenuItem href="/logout" method="post" danger onClick={() => setOpen(false)}>
                      Log Out
                    </MenuItem>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
