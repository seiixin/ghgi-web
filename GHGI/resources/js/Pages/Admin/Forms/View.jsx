import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import { apiGet } from '@/Components/Admin/FormsV2/api';
import { humanizeLaravelError } from '@/Components/Admin/FormsV2/errors';
import Card from '@/Components/Admin/FormsV2/Card';
import Badge from '@/Components/Admin/FormsV2/Badge';
import FormPreview from '@/Components/Admin/FormsV2/FormPreview';
import { Button } from '@/Components/Admin/FormsV2/Button';

function pickActiveSchema(schemaVersions = []) {
  const active = schemaVersions.find((v) => v.status === 'active');
  return active || schemaVersions[0] || null;
}

export default function FormsView({ auth, id }) {
  const formId = id ?? (typeof window !== 'undefined' ? window.location.pathname.split('/').slice(-1)[0] : null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [row, setRow] = useState(null);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (!formId) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiGet('/api/admin/forms?year=2023');
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        const r = list.find((x) => String(x.id) === String(formId));
        if (!r) throw new Error('Form not found');

        const versions = r.schema_versions || r.schemaVersions || [];
        const activeSchema = pickActiveSchema(versions);
        const schemaJson = activeSchema?.schema_json || {};
        const schemaFields = Array.isArray(schemaJson.fields) ? schemaJson.fields : [];

        setRow({ ...r, activeSchema });
        setFields(schemaFields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: !!f.required, options: Array.isArray(f.options) ? f.options : [] })));
      } catch (e) {
        setError(humanizeLaravelError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [formId]);

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="View Form" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-gray-900">View Form</div>
            <div className="text-sm text-gray-600">Preview the form as enumerators will see it.</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/management/forms" className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back to list</Link>
            {row ? <Button variant="outline" onClick={() => (window.location.href = `/admin/management/forms/${row.id}/edit`)}>Edit</Button> : null}
          </div>
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div> : null}

        {loading ? <div className="text-sm text-gray-500">Loading…</div> : row ? (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-gray-900">{row.name}</div>
                  <div className="text-xs text-gray-500">{row.key} • {row.sector_key}</div>
                </div>
                <div className="flex items-center gap-2">
                  {row.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}
                  <Badge tone="blue">{row.activeSchema?.status || 'no schema'}</Badge>
                </div>
              </div>
            </Card>

            <FormPreview title={row.name} description={row.description || ''} fields={fields} />
          </>
        ) : null}
      </div>
    </AuthenticatedLayout>
  );
}
