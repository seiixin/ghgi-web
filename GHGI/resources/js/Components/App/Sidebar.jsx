// resources/js/Components/App/Sidebar.jsx
import React, { useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Icon wrapper to keep consistent sizing + hover styles.
 */
function NavIcon({ children, active }) {
  return (
    <span
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl ring-1 transition",
        active
          ? "bg-slate-800 ring-slate-700/80"
          : "bg-slate-800/40 ring-slate-700/60 group-hover:bg-slate-800/70"
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function NavItem({ href, active, icon, label, badge, disabled }) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
        disabled && "pointer-events-none opacity-60",
        active
          ? "bg-slate-800 text-white"
          : "text-slate-200 hover:bg-slate-800/50 hover:text-white"
      )}
    >
      <NavIcon active={active}>{icon}</NavIcon>

      <span className="flex-1">{label}</span>

      {badge ? (
        <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] font-semibold text-slate-200 ring-1 ring-slate-700/60">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-4 pt-5 pb-2 text-[11px] font-semibold tracking-wider text-slate-400">
      {children}
    </div>
  );
}

/** Icons */
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
function IconChevron({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("transition", open ? "rotate-90" : "rotate-0")}
      aria-hidden="true"
    >
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 17l1 4h10V3H11l-1 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3 12h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 8l-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Build nav groups here.
 * - One sidebar for all users (ADMIN + ENUMERATOR)
 * - Permissions are enforced in backend (routes/middleware) and by hiding CRUD buttons on frontend.
 */
function buildNavItems(url) {
  return [
    {
      title: "Main",
      items: [
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
      ],
    },
  ];
}

/**
 * Sidebar
 * - Collapsible header (brand + minimize)
 * - Groups with section labels
 * - Bottom utility section (e.g., logout)
 * - Active state derived from Inertia url
 */
export default function Sidebar() {
  const { url, props } = usePage();

  // If your app provides auth user in props, these are safe optional reads.
  const user =
    props?.auth?.user || props?.auth?.user_data || props?.user || null;

  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => buildNavItems(url), [url]);

  return (
    <aside
      className={cn(
        "min-h-screen bg-slate-900 text-white ring-1 ring-slate-800/80",
        collapsed ? "w-[92px]" : "w-72"
      )}
    >
      {/* Header / Brand */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-800/60 ring-1 ring-slate-700/60">
            <IconInbox />
          </div>

          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold leading-5">
                GHGI Admin
              </div>
              <div className="truncate text-xs text-slate-400">
                {user?.name ? `Signed in as ${user.name}` : "Navigation"}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-2xl transition",
              "bg-slate-800/40 ring-1 ring-slate-700/60 hover:bg-slate-800/70"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconChevron open={!collapsed} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 pb-6">
        {groups.map((g) => (
          <div key={g.title} className="mb-2">
            {!collapsed ? <SectionLabel>{g.title}</SectionLabel> : null}

            <div className="space-y-1">
              {g.items.map((it) => (
                <NavItem
                  key={it.href}
                  href={it.href}
                  active={!!it.active}
                  icon={it.icon}
                  label={collapsed ? "" : it.label}
                  badge={collapsed ? null : it.badge}
                  disabled={!!it.disabled}
                />
              ))}
            </div>

            {/* Collapsed labels (tooltip-like via title attribute) */}
            {collapsed ? (
              <div className="sr-only">
                {g.items.map((it) => (
                  <span key={it.href}>{it.label}</span>
                ))}
              </div>
            ) : null}

            {/* When collapsed, show icons centered with title attr */}
            {collapsed ? (
              <div className="-mt-[calc(100%)] hidden" />
            ) : null}
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="mt-auto px-3 pb-5">
        <div
          className={cn(
            "rounded-2xl bg-slate-800/30 ring-1 ring-slate-700/50",
            collapsed ? "p-2" : "p-3"
          )}
        >
          {!collapsed ? (
            <div className="mb-2 text-xs text-slate-400">
              Quick actions
            </div>
          ) : null}

          <Link
            href="/logout"
            method="post"
            as="button"
            className={cn(
              "w-full group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              "text-slate-200 hover:bg-slate-800/60 hover:text-white"
            )}
          >
            <NavIcon active={false}>
              <IconLogout />
            </NavIcon>
            {!collapsed ? <span className="flex-1 text-left">Logout</span> : null}
          </Link>
        </div>
      </div>
    </aside>
  );
}
