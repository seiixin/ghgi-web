// resources/js/Components/App/Sidebar.jsx
import React from "react";
import { Link, usePage } from "@inertiajs/react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function NavItem({ href, active, icon, children }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
        active
          ? "bg-slate-800 text-white"
          : "text-slate-200 hover:bg-slate-800/50 hover:text-white"
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800/50 ring-1 ring-slate-700/60">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSheet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h7l3 3v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v4a1 1 0 0 0 1 1h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 12h8M8 16h8M8 8h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconSummary() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 3v5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 14h8M8 10h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 3v15M15 6v15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconInbox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h16v12l-3 4H7l-3-4V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 16h5l2 2h2l2-2h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const { url } = usePage();

  // One sidebar for all users (ADMIN + ENUMERATOR)
  // Permissions are enforced in backend (routes/middleware) and by hiding CRUD buttons on frontend.
  const items = [
    {
      href: "/admin/dashboard",
      active: url.startsWith("/admin/dashboard") || url === "/dashboard",
      icon: <IconHome />,
      label: "Dashboard",
    },
    {
      href: "/admin/quantification",
      active: url.startsWith("/admin/quantification"),
      icon: <IconSheet />,
      label: "Quantification Sheet",
    },
    {
      href: "/admin/summary",
      active: url.startsWith("/admin/summary"),
      icon: <IconSummary />,
      label: "GHG Summary",
    },
    {
      href: "/admin/map",
      active: url.startsWith("/admin/map"),
      icon: <IconMap />,
      label: "Map",
    },
    {
      href: "/admin/submissions",
      active: url.startsWith("/admin/submissions"),
      icon: <IconInbox />,
      label: "Submissions",
    },
  ];

  return (
    <aside className="min-h-screen w-72 bg-slate-900 text-white">
      <div className="px-3 pt-4 pb-6">
        <div className="space-y-1">
          {items.map((it) => (
            <NavItem
              key={it.href}
              href={it.href}
              active={it.active}
              icon={it.icon}
            >
              {it.label}
            </NavItem>
          ))}
        </div>
      </div>
    </aside>
  );
}
