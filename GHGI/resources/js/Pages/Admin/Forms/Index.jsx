import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import { apiDelete, apiGet } from '@/Components/Admin/FormsV2/api';
import FormsTable from '@/Components/Admin/FormsV2/FormsTable';
import ConfirmDialog from '@/Components/Admin/FormsV2/ConfirmDialog';
import { Button } from '@/Components/Admin/FormsV2/Button';
import { humanizeLaravelError } from '@/Components/Admin/FormsV2/errors';

function pickActiveSchema(schemaVersions = []) {
  const active = schemaVersions.find((v) => v.status === 'active');
  return active || schemaVersions[0] || null;
}

function normalizeRow(r) {
  const schema_versions = r.schema_versions || r.schemaVersions || [];
  return { id: r.id, key: r.key, name: r.name, is_active: !!r.is_active, activeSchema: pickActiveSchema(schema_versions) };
}

export default function FormsIndex({ auth }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirm, setConfirm] = useState({ open: false, row: null });
  const [busyDelete, setBusyDelete] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    const data = await apiGet('/api/admin/forms?year=2023');
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    setRows(list.map(normalizeRow));
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function doDelete() {
    if (!confirm.row) return;
    setBusyDelete(true);
    setError('');
    try {
      await apiDelete(`/api/admin/forms/${confirm.row.id}`);
      setConfirm({ open: false, row: null });
      await load();
    } catch (e) {
      setError(humanizeLaravelError(e));
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Forms" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-gray-900">Forms</div>
            <div className="text-sm text-gray-600">Manage dynamic forms used by enumerators for data collection.</div>
          </div>
          <Link href="/admin/management/forms/create"><Button variant="primary">+ New Form</Button></Link>
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div> : null}

        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <FormsTable
            rows={rows}
            onView={(r) => (window.location.href = `/admin/management/forms/${r.id}`)}
            onEdit={(r) => (window.location.href = `/admin/management/forms/${r.id}/edit`)}
            onDelete={(r) => setConfirm({ open: true, row: r })}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete form?"
        message={confirm.row ? `This will delete "${confirm.row.name}" and its schema versions.` : ''}
        confirmText="Delete"
        tone="danger"
        onClose={() => setConfirm({ open: false, row: null })}
        onConfirm={doDelete}
        busy={busyDelete}
      />
    </AuthenticatedLayout>
  );
}
