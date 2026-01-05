import { useEffect, useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import { Button } from '@/Components/Admin/FormsV2/Button';
import FormBuilderEditable from '@/Components/Admin/FormsV2/FormBuilderEditable';
import FormPreview from '@/Components/Admin/FormsV2/FormPreview';
import ConfirmDialog from '@/Components/Admin/FormsV2/ConfirmDialog';

import { apiDelete, apiGet, apiPatch, apiPost } from '@/Components/Admin/FormsV2/api';
import { buildMappingJson, buildSchemaJson, buildUiJson } from '@/Components/Admin/FormsV2/schema';
import { humanizeLaravelError } from '@/Components/Admin/FormsV2/errors';
import { FormMetaCard } from './_FormMetaCard';

function pickActiveSchema(schemaVersions = []) {
  const active = schemaVersions.find((v) => v.status === 'active');
  return active || schemaVersions[0] || null;
}

export default function FormsEdit({ auth, id }) {
  const formId = id ?? (typeof window !== 'undefined' ? window.location.pathname.split('/').slice(-2)[0] : null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [municipality, setMunicipality] = useState('All LGUs');
  const [barangay, setBarangay] = useState('');
  const [active, setActive] = useState(true);

  const [key, setKey] = useState('');
  const [sectorKey, setSectorKey] = useState('');
  const [fields, setFields] = useState([]);
  const [description, setDescription] = useState('');

  const canSave = useMemo(() => title.trim() && key.trim() && sectorKey.trim() && fields.length > 0, [title, key, sectorKey, fields]);

  function hydrateFromSchema(schema) {
    const ui = schema?.ui_json || {};
    const meta = ui?.meta || {};
    setMunicipality(meta.municipality || 'All LGUs');
    setBarangay(meta.barangay || '');

    const schemaJson = schema?.schema_json || {};
    const schemaFields = Array.isArray(schemaJson.fields) ? schemaJson.fields : [];
    setFields(schemaFields.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      key: f.key,
      label: f.label,
      type: f.type,
      required: !!f.required,
      options: Array.isArray(f.options) ? f.options : [],
    })));
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/api/admin/forms?year=2023');
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      const row = list.find((x) => String(x.id) === String(formId));
      if (!row) throw new Error('Form not found');

      setTitle(row.name || '');
      setKey(row.key || '');
      setSectorKey(row.sector_key || '');
      setActive(!!row.is_active);
      setDescription(row.description || '');

      const versions = row.schema_versions || row.schemaVersions || [];
      const activeSchema = pickActiveSchema(versions);
      if (activeSchema) hydrateFromSchema(activeSchema);
      else setFields([]);
    } catch (e) {
      setError(humanizeLaravelError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (formId) load(); }, [formId]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await apiPatch(`/api/admin/forms/${formId}`, {
        name: title.trim(),
        key: key.trim(),
        sector_key: sectorKey.trim(),
        is_active: !!active,
      });

      const schema_json = buildSchemaJson({ title: title.trim(), fields });
      const ui_json = buildUiJson({ municipalityLabel: municipality, barangayText: barangay });
      await apiPost(`/api/admin/forms/${formId}/schemas`, { year: 2023, schema_json, ui_json, status: 'active' });

      const mapping_json = buildMappingJson(fields);
      await apiPost(`/api/admin/forms/${formId}/mapping`, { year: 2023, mapping_json });

      window.location.href = '/admin/management/forms';
    } catch (e) {
      setError(humanizeLaravelError(e));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setBusyDelete(true);
    setError('');
    try {
      await apiDelete(`/api/admin/forms/${formId}`);
      window.location.href = '/admin/management/forms';
    } catch (e) {
      setError(humanizeLaravelError(e));
    } finally {
      setBusyDelete(false);
      setConfirmDelete(false);
    }
  }

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Edit Form" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-gray-900">Edit Form</div>
            <div className="text-sm text-gray-600">Fields are editable. Saving creates a new active schema version.</div>
          </div>
          <Link href="/admin/management/forms" className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back to list</Link>
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div> : null}

        <div className="flex items-center justify-end">
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete Form</Button>
        </div>

        <FormMetaCard
          title={title} setTitle={setTitle}
          municipality={municipality} setMunicipality={setMunicipality}
          barangay={barangay} setBarangay={setBarangay}
          active={active} setActive={setActive}
          key={key} setKey={setKey}
          sectorKey={sectorKey} setSectorKey={setSectorKey}
        />

        <FormBuilderEditable fields={fields} setFields={setFields} />
        <FormPreview title={title} description={description} fields={fields} />

        <div className="flex items-center justify-start">
          <Button variant="primary" onClick={save} disabled={!canSave || saving || loading}>{saving ? 'Saving…' : 'Save Form'}</Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete form?"
        message="This will delete the form and all schema versions."
        confirmText="Delete"
        tone="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        busy={busyDelete}
      />
    </AuthenticatedLayout>
  );
}
