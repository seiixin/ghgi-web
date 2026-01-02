import React from 'react';
import { usePage, Link } from '@inertiajs/react';
import Badge from '../Components/Shared/Badge';

export default function EnumeratorLayout({ title, children }) {
  const { props } = usePage();
  const user = props.auth?.user;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="text-sm font-semibold">{props.app?.name ?? 'GHGI-Laguna'}</div>
          <div className="flex items-center gap-2">
            <Badge tone="blue">{user?.role ?? 'ENUMERATOR'}</Badge>
            <span className="text-sm text-slate-700">{user?.name ?? 'Enumerator'}</span>
            <Link href={route('logout')} method="post" as="button" className="ml-2 rounded-lg border px-3 py-1 text-sm hover:bg-slate-50">
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {title ? <div className="mb-4 text-xl font-semibold tracking-tight">{title}</div> : null}
        {children}
      </main>
    </div>
  );
}
