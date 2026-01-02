import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import Badge from '../Components/Shared/Badge';

function NavItem({ href, active, children }) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
        active ? 'bg-slate-800/70 text-white' : 'text-slate-200 hover:bg-slate-800/40 hover:text-white',
      ].join(' ')}
    >
      <span className="h-2 w-2 rounded-full bg-slate-500/60" />
      <span>{children}</span>
    </Link>
  );
}

export default function AdminLayout({ title, children }) {
  const { url, props } = usePage();
  const user = props.auth?.user;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="min-h-screen w-72 bg-slate-900 text-white">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/30">
              <div className="h-5 w-5 rounded bg-emerald-500/80" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] tracking-widest text-slate-300">COMMUNITY GHG</div>
              <div className="text-sm font-semibold">Laguna Inventory</div>
            </div>
          </div>

          <nav className="px-3 pb-6">
            <div className="space-y-1">
              <NavItem href="/admin/dashboard" active={url.startsWith('/admin/dashboard')}>Dashboard</NavItem>
              <NavItem href="/admin/quantification" active={url.startsWith('/admin/quantification')}>Quantification Sheet</NavItem>
              <NavItem href="/admin/summary" active={url.startsWith('/admin/summary')}>GHG Summary</NavItem>
              <NavItem href="/admin/map" active={url.startsWith('/admin/map')}>Map</NavItem>
              <NavItem href="/admin/submissions" active={url.startsWith('/admin/submissions')}>Submissions</NavItem>
            </div>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-900/90 backdrop-blur">
            <div className="flex items-center justify-end px-6 py-3">
              <div className="flex items-center gap-3 rounded-full bg-slate-800/60 px-3 py-1.5 ring-1 ring-slate-700">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-semibold">
                  {user?.name?.slice(0, 2)?.toUpperCase() ?? 'AU'}
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-semibold text-white">{user?.name ?? 'Admin User'}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge tone="green">{user?.role ?? 'ADMIN'}</Badge>
                    <span className="text-[11px] text-slate-300">System Administrator</span>
                  </div>
                </div>
                <Link href={route('logout')} method="post" as="button" className="ml-2 rounded-lg bg-slate-700/60 px-3 py-1 text-xs text-white hover:bg-slate-700">
                  Logout
                </Link>
              </div>
            </div>
          </header>

          <div className="px-8 py-6">
            {title ? <div className="mb-5 text-2xl font-semibold tracking-tight">{title}</div> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
