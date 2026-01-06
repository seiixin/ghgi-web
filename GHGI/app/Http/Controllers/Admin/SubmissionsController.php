<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\FormMapping;
use App\Models\Submission;
use App\Models\SubmissionAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SubmissionsController extends ApiController
{
    public function index(Request $request)
    {
        $q = Submission::query()
            ->with(['formType'])
            ->withCount('answers')
            ->orderByDesc('id');

        if ($request->filled('form_type_id')) {
            $q->where('form_type_id', (int) $request->form_type_id);
        }
        if ($request->filled('year')) {
            $q->where('year', (int) $request->year);
        }
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($request->filled('source')) {
            $q->where('source', $request->source);
        }

        // Optional location filters (added)
        if ($request->filled('reg_name')) {
            $q->where('reg_name', $request->reg_name);
        }
        if ($request->filled('prov_name')) {
            $q->where('prov_name', $request->prov_name);
        }
        if ($request->filled('city_name')) {
            $q->where('city_name', $request->city_name);
        }
        if ($request->filled('brgy_name')) {
            $q->where('brgy_name', $request->brgy_name);
        }

        $rows = $q->paginate((int) ($request->get('per_page', 20)));

        $rows->getCollection()->transform(function ($s) {
            $s->form_type_name = $s->formType->name ?? $s->form_type_name ?? null;
            return $s;
        });

        return $this->ok($rows);
    }

    public function store(Request $request)
    {
        $user = $this->requireAuth();

        $data = $request->validate([
            'form_type_id' => ['required', 'integer', 'min:1'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'mapping_id' => ['nullable', 'integer', 'min:1'],
            'schema_version_id' => ['nullable', 'integer', 'min:1'],
            'source' => ['nullable', 'string', 'max:20'],

            // Location fields (added; optional on create/draft)
            'reg_name' => ['nullable', 'string', 'max:120'],
            'prov_name' => ['nullable', 'string', 'max:120'],
            'city_name' => ['nullable', 'string', 'max:120'],
            'brgy_name' => ['nullable', 'string', 'max:120'],
        ]);

        $mapping = null;

        if (!empty($data['mapping_id'])) {
            $mapping = FormMapping::query()->whereKey($data['mapping_id'])->first();
        } else {
            $mapping = FormMapping::query()
                ->where('form_type_id', $data['form_type_id'])
                ->where('year', $data['year'])
                ->orderByDesc('id')
                ->first();
        }

        $payload = [
            'form_type_id' => $data['form_type_id'],
            'schema_version_id' => $data['schema_version_id'] ?? null,
            'mapping_id' => $mapping?->id,
            'year' => $data['year'],
            'source' => $data['source'] ?? 'admin',
            'status' => 'draft',
            'created_by' => $user->id,

            // Location (saved to submissions table)
            'reg_name' => $data['reg_name'] ?? null,
            'prov_name' => $data['prov_name'] ?? null,
            'city_name' => $data['city_name'] ?? null,
            'brgy_name' => $data['brgy_name'] ?? null,
        ];

        $submission = Submission::query()->create($payload);
        $submission->loadMissing(['formType']);
        $submission->form_type_name = $submission->formType->name ?? null;

        return $this->ok([
            'submission' => $submission,
            'mapping_json' => $mapping?->mapping_json ?? (object) [],
        ], 'Created', 201);
    }

    public function show(Submission $submission)
    {
        $submission->loadMissing(['formType']);
        $submission->form_type_name = $submission->formType->name ?? $submission->form_type_name ?? null;

        $mapping = null;
        if ($submission->mapping_id) {
            $mapping = FormMapping::query()->whereKey($submission->mapping_id)->first();
        } else {
            $mapping = FormMapping::query()
                ->where('form_type_id', $submission->form_type_id)
                ->where('year', $submission->year)
                ->orderByDesc('id')
                ->first();
        }

        $answers = SubmissionAnswer::query()
            ->where('submission_id', $submission->id)
            ->orderBy('field_key')
            ->get();

        $answersHuman = $answers->map(function (SubmissionAnswer $a) {
            $value = null;

            if (!empty($a->option_label)) {
                $value = $a->option_label;
            } elseif (!is_null($a->value_text) && trim((string) $a->value_text) !== '') {
                $value = $a->value_text;
            } elseif (!is_null($a->value_number)) {
                $value = $a->value_number;
            } elseif (!is_null($a->value_bool)) {
                $value = $a->value_bool ? 'Yes' : 'No';
            } elseif (!is_null($a->value_json)) {
                $value = $a->value_json;
            }

            return [
                'field_key' => $a->field_key,
                'label' => $a->label ?: null,
                'type' => $a->type ?: null,
                'value' => $value,
                'option_key' => $a->option_key ?: null,
                'option_label' => $a->option_label ?: null,
            ];
        })->values();

        return $this->ok([
            'submission' => $submission,
            'mapping_json' => $mapping?->mapping_json ?? (object) [],
            'answers' => $answers,
            'answers_human' => $answersHuman,
        ]);
    }

    public function update(Request $request, Submission $submission)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:20'],
            'source' => ['nullable', 'string', 'max:20'],

            // Location updates (added)
            'reg_name' => ['nullable', 'string', 'max:120'],
            'prov_name' => ['nullable', 'string', 'max:120'],
            'city_name' => ['nullable', 'string', 'max:120'],
            'brgy_name' => ['nullable', 'string', 'max:120'],
        ]);

        if (isset($data['status']) && $data['status'] !== $submission->status) {
            $allowed = ['draft', 'reviewed', 'rejected'];
            if (!in_array($data['status'], $allowed, true)) {
                return $this->fail('Invalid status update.', ['allowed' => $allowed], 422);
            }
            if ($submission->status === 'submitted') {
                if (!in_array($data['status'], ['reviewed', 'rejected'], true)) {
                    return $this->fail('Invalid transition from submitted.', null, 422);
                }
            }
        }

        $submission->fill($data);
        $submission->save();

        return $this->ok($submission, 'Updated');
    }

    public function destroy(Submission $submission)
    {
        $submission->delete();
        return $this->ok(null, 'Deleted');
    }

    public function upsertAnswers(Request $request, Submission $submission)
    {
        $payload = $request->validate([
            'answers' => ['required', 'array'],
            'snapshots' => ['nullable', 'array'],
            'mode' => ['nullable', 'string', 'in:draft,submit'],

            // Allow location to be sent alongside answers (added)
            'reg_name' => ['nullable', 'string', 'max:120'],
            'prov_name' => ['nullable', 'string', 'max:120'],
            'city_name' => ['nullable', 'string', 'max:120'],
            'brgy_name' => ['nullable', 'string', 'max:120'],
        ]);

        // If location was included, save it on the submission (draft save allowed)
        $locFields = ['reg_name', 'prov_name', 'city_name', 'brgy_name'];
        $locDirty = false;
        foreach ($locFields as $f) {
            if (array_key_exists($f, $payload)) {
                $submission->{$f} = $payload[$f];
                $locDirty = true;
            }
        }
        if ($locDirty) {
            $submission->save();
        }

        $answers = $payload['answers'] ?? [];
        $snapshots = $payload['snapshots'] ?? [];

        $mapping = null;
        if ($submission->mapping_id) {
            $mapping = FormMapping::query()->whereKey($submission->mapping_id)->first();
        } else {
            $mapping = FormMapping::query()
                ->where('form_type_id', $submission->form_type_id)
                ->where('year', $submission->year)
                ->orderByDesc('id')
                ->first();
        }

        $allowedKeys = [];
        if ($mapping && is_array($mapping->mapping_json)) {
            $allowedKeys = array_keys($mapping->mapping_json);
        }

        $updated = 0;
        $rejected = [];

        foreach ($answers as $fieldKey => $value) {
            $fieldKey = (string) $fieldKey;

            if (!empty($allowedKeys) && !in_array($fieldKey, $allowedKeys, true)) {
                $rejected[] = $fieldKey;
                continue;
            }

            $row = SubmissionAnswer::query()->firstOrNew([
                'submission_id' => $submission->id,
                'field_key' => $fieldKey,
            ]);

            $row->form_type_id = $submission->form_type_id;
            $row->year = $submission->year;

            $row->value_text = null;
            $row->value_number = null;
            $row->value_bool = null;
            $row->value_json = null;

            $ss = (isset($snapshots[$fieldKey]) && is_array($snapshots[$fieldKey])) ? $snapshots[$fieldKey] : null;
            if ($ss) {
                $row->label = $ss['label'] ?? $row->label;
                $row->type = $ss['type'] ?? $row->type;
                $row->option_key = $ss['option_key'] ?? $row->option_key;
                $row->option_label = $ss['option_label'] ?? $row->option_label;
            }

            if (!empty($row->option_label)) {
                $row->value_text = (string) $row->option_label;
            } else {
                if (is_bool($value)) {
                    $row->value_bool = $value;
                } elseif (is_int($value) || is_float($value)) {
                    $row->value_number = $value;
                } elseif (is_array($value) || is_object($value)) {
                    $row->value_json = $value;
                } else {
                    $row->value_text = is_null($value) ? null : (string) $value;
                }
            }

            if (in_array($row->type, ['select', 'radio', 'multiple_choice'], true)) {
                if (empty($row->option_key) && !is_array($value) && !is_object($value) && !is_null($value)) {
                    $row->option_key = (string) $value;
                }
            }

            $row->save();
            $updated++;
        }

        // If caller says mode=submit, validate location is present (added)
        if (($payload['mode'] ?? null) === 'submit') {
            $missing = [];
            if (empty($submission->prov_name)) $missing[] = 'prov_name';
            if (empty($submission->city_name)) $missing[] = 'city_name';
            // brgy can be optional depending on your rule; here we require it if provided in payload OR already set as required in UI
            if (empty($submission->brgy_name)) $missing[] = 'brgy_name';

            if (!empty($missing)) {
                return $this->fail('Location is required before submit.', [
                    'missing' => $missing,
                ], 422);
            }
        }

        return $this->ok([
            'updated' => $updated,
            'rejected' => $rejected,
        ], 'Saved');
    }

    public function submit(Request $request, Submission $submission)
    {
        if ($submission->status === 'submitted') {
            return $this->ok($submission, 'Already submitted');
        }

        // Enforce required location on submit (added)
        $missing = [];
        if (empty($submission->prov_name)) $missing[] = 'prov_name';
        if (empty($submission->city_name)) $missing[] = 'city_name';
        if (empty($submission->brgy_name)) $missing[] = 'brgy_name';

        if (!empty($missing)) {
            return $this->fail('Location is required before submit.', [
                'missing' => $missing,
            ], 422);
        }

        $submission->status = 'submitted';
        $submission->submitted_at = Carbon::now();
        $submission->save();

        return $this->ok($submission, 'Submitted');
    }
}
