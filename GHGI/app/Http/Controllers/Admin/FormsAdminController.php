<?php
// app/Http/Controllers/Admin/FormsAdminController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FormMapping;
use App\Models\FormSchemaVersion;
use App\Models\FormType;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FormsAdminController extends Controller
{
    /**
     * GET /api/admin/forms?sector=&active=&year=2023
     * Returns form types, plus schema_versions + mappings filtered to requested year (if provided).
     */
    public function index(Request $request)
    {
        $year = (int) ($request->query('year', 0));
        $sector = trim((string) $request->query('sector', ''));
        $active = trim((string) $request->query('active', 'all')); // all|active|inactive

        $q = FormType::query();

        if ($sector !== '') {
            $q->where('sector_key', $sector);
        }

        if ($active === 'active') {
            $q->where('is_active', true);
        } elseif ($active === 'inactive') {
            $q->where('is_active', false);
        }

        $q->with([
            'schemaVersions' => function ($sq) use ($year) {
                if ($year > 0) $sq->where('year', $year);
                $sq->orderByDesc('year')->orderByDesc('version');
            },
            'mappings' => function ($mq) use ($year) {
                if ($year > 0) $mq->where('year', $year);
                $mq->orderByDesc('year')->orderByDesc('id');
            },
        ]);

        $rows = $q->orderBy('sector_key')->orderBy('name')->get();

        // Return a stable shape that your React normalizer already tolerates
        return response()->json($rows->map(function (FormType $f) {
            return [
                'id' => $f->id,
                'key' => $f->key,
                'name' => $f->name,
                'sector_key' => $f->sector_key,
                'description' => $f->description,
                'is_active' => (bool) $f->is_active,
                'schema_versions' => $f->schemaVersions->map(fn ($v) => [
                    'id' => $v->id,
                    'form_type_id' => $v->form_type_id,
                    'year' => $v->year,
                    'version' => $v->version,
                    'schema_json' => $v->schema_json,
                    'ui_json' => $v->ui_json,
                    'status' => $v->status,
                    'created_at' => $v->created_at,
                ])->values(),
                'mappings' => $f->mappings->map(fn ($m) => [
                    'id' => $m->id,
                    'form_type_id' => $m->form_type_id,
                    'year' => $m->year,
                    'mapping_json' => $m->mapping_json,
                    'created_at' => $m->created_at,
                ])->values(),
            ];
        })->values());
    }

    /**
     * POST /api/admin/forms
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:120', 'regex:/^[a-z0-9\\-_.]+$/', 'unique:form_types,key'],
            'name' => ['required', 'string', 'max:255'],
            'sector_key' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $form = FormType::create([
            'key' => $data['key'],
            'name' => $data['name'],
            'sector_key' => $data['sector_key'],
            'description' => $data['description'] ?? null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return response()->json(['ok' => true, 'id' => $form->id], 201);
    }

    /**
     * PATCH /api/admin/forms/{id}
     */
    public function update(Request $request, FormType $formType)
    {
        $data = $request->validate([
            'key' => [
                'sometimes', 'string', 'max:120', 'regex:/^[a-z0-9\\-_.]+$/',
                Rule::unique('form_types', 'key')->ignore($formType->id),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'sector_key' => ['sometimes', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $formType->fill($data);
        $formType->save();

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/admin/forms/{id}/schemas
     * Creates a new schema version (auto-increments version for the year).
     * Body: { year, schema_json, ui_json? , status? }
     */
    public function storeSchema(Request $request, FormType $formType)
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'schema_json' => ['required', 'array'],
            'ui_json' => ['nullable', 'array'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'active'])],
        ]);

        $year = (int) $data['year'];

        $latestVersion = FormSchemaVersion::query()
            ->where('form_type_id', $formType->id)
            ->where('year', $year)
            ->max('version');

        $nextVersion = ((int) $latestVersion) + 1;
        $status = $data['status'] ?? 'draft';

        $schema = FormSchemaVersion::create([
            'form_type_id' => $formType->id,
            'year' => $year,
            'version' => $nextVersion,
            'schema_json' => $data['schema_json'],
            'ui_json' => $data['ui_json'] ?? null,
            'status' => $status,
        ]);

        // If set active, enforce single-active per (form, year)
        if ($status === 'active') {
            FormSchemaVersion::query()
                ->where('form_type_id', $formType->id)
                ->where('year', $year)
                ->where('id', '!=', $schema->id)
                ->where('status', 'active')
                ->update(['status' => 'deprecated']);
        }

        return response()->json(['ok' => true, 'id' => $schema->id], 201);
    }

    /**
     * PATCH /api/admin/forms/schemas/{schemaId}
     * Body: { status: active|draft|deprecated }
     */
    public function patchSchemaStatus(Request $request, FormSchemaVersion $schemaVersion)
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['active', 'draft', 'deprecated'])],
        ]);

        $schemaVersion->status = $data['status'];
        $schemaVersion->save();

        // If activating, deprecate other active versions for same (form, year)
        if ($data['status'] === 'active') {
            FormSchemaVersion::query()
                ->where('form_type_id', $schemaVersion->form_type_id)
                ->where('year', $schemaVersion->year)
                ->where('id', '!=', $schemaVersion->id)
                ->where('status', 'active')
                ->update(['status' => 'deprecated']);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/admin/forms/{id}/mapping
     * Body: { year, mapping_json }
     */
    public function saveMapping(Request $request, FormType $formType)
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'mapping_json' => ['required', 'array'],
        ]);

        FormMapping::updateOrCreate(
            ['form_type_id' => $formType->id, 'year' => (int) $data['year']],
            ['mapping_json' => $data['mapping_json']]
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id)
    {
        $form = FormType::findOrFail($id);

        // If you have relations, delete them too (or rely on cascade FK)
        // $form->schemaVersions()->delete();
        // $form->mappings()->delete();

        $form->delete();

        return response()->json(['ok' => true]);
    }

}
