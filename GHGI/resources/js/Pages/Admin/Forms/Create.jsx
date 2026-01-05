import { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import { Button } from '@/Components/Admin/FormsV2/Button';
import FormBuilderEditable from '@/Components/Admin/FormsV2/FormBuilderEditable';
import FormPreview from '@/Components/Admin/FormsV2/FormPreview';

import { apiPost } from '@/Components/Admin/FormsV2/api';
import { buildMappingJson, buildSchemaJson, buildUiJson, slugifyKey } from '@/Components/Admin/FormsV2/schema';
import { humanizeLaravelError } from '@/Components/Admin/FormsV2/errors';
import { FormMetaCard } from './_FormMetaCard';

export default function FormsCreate({ auth }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [municipality, setMunicipality] = useState('All LGUs');
  const [barangay, setBarangay] = useState('');
  const [active, setActive] = useState(true);

  const [key, setKey] = useState('');
  const [sectorKey, setSectorKey] = useState('');
  const [fields, setFields] = useState([]);

  const canSave = useMemo(() => title.trim() && (key.trim() || slugifyKey(title)) && sectorKey.trim() && fields.length > 0, [title, key, sectorKey, fields]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const formPayload = {
        name: title.trim(),
        key: (key.trim() ? key.trim() : slugifyKey(title)).replace(/_/g, '-'),
        sector_key: sectorKey.trim(),
        description: '',
        is_active: !!active,
      };

      const created = await apiPost('/api/admin/forms', formPayload);
      const formId = created?.id;
      if (!formId) throw new Error('Create form did not return id');

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

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Create Form" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-gray-900">Create Form</div>
            <div className="text-sm text-gray-600">Define basic info and schema. Fields are editable after adding.</div>
          </div>
          <Link href="/admin/management/forms" className="text-sm font-semibold text-gray-600 hover:text-gray-900">← Back to list</Link>
        </div>

        {error ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div> : null}

        <FormMetaCard
          title={title}
          setTitle={(v) => { setTitle(v); if (!key) setKey(slugifyKey(v).replace(/_/g, '-')); }}
          municipality={municipality}
          setMunicipality={setMunicipality}
          barangay={barangay}
          setBarangay={setBarangay}
          active={active}
          setActive={setActive}
          key={key}
          setKey={setKey}
          sectorKey={sectorKey}
          setSectorKey={setSectorKey}
        />

        <FormBuilderEditable fields={fields} setFields={setFields} />
        <FormPreview title={title} description="" fields={fields} />

        <div className="flex items-center justify-start">
          <Button variant="primary" onClick={save} disabled={!canSave || saving}>{saving ? 'Saving…' : 'Save Form'}</Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
