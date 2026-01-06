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
            ->withCount('answers')
            ->orderByDesc('id');

        if ($request->filled('year')) {
            $q->where('year', (int) $request->year);
        }
        if ($request->filled('form_type_id')) {
            $q->where('form_type_id', (int) $request->form_type_id);
        }
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($request->filled('source')) {
            $q->where('source', $request->source);
        }

        $rows = $q->paginate((int)($request->get('per_page', 20)));

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

        if (!$mapping) {
            return $this->fail('No form mapping found for this form/year.', [
                'form_type_id' => $data['form_type_id'],
                'year' => $data['year'],
            ], 422);
        }

        $submission = Submission::query()->create([
            'form_type_id' => $data['form_type_id'],
            'schema_version_id' => $data['schema_version_id'] ?? null,
            'mapping_id' => $mapping->id,
            'year' => $data['year'],
            'source' => $data['source'] ?? 'admin',
            'status' => 'draft',
            'created_by' => $user->id,
        ]);

        return $this->ok([
            'submission' => $submission,
            'mapping_json' => $mapping->mapping_json,
        ], 'Created', 201);
    }

    public function show(Submission $submission)
    {
        $mapping = $submission->mapping_id
            ? FormMapping::query()->whereKey($submission->mapping_id)->first()
            : FormMapping::query()
                ->where('form_type_id', $submission->form_type_id)
                ->where('year', $submission->year)
                ->orderByDesc('id')
                ->first();

        $answers = SubmissionAnswer::query()
            ->where('submission_id', $submission->id)
            ->get()
            ->keyBy('field_key');

        return $this->ok([
            'submission' => $submission,
            'mapping_json' => $mapping?->mapping_json,
            'answers' => $answers,
        ]);
    }

    public function update(Request $request, Submission $submission)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:20'],
            'source' => ['nullable', 'string', 'max:20'],
        ]);

        // Keep status transitions strict (submit via submit endpoint)
        if (isset($data['status']) && $data['status'] !== $submission->status) {
            $allowed = ['draft', 'reviewed', 'rejected'];
            if (!in_array($data['status'], $allowed, true)) {
                return $this->fail('Invalid status update.', ['allowed' => $allowed], 422);
            }
            if ($submission->status === 'submitted') {
                // allow reviewed/rejected from submitted
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
        ]);

        $mapping = $submission->mapping_id
            ? FormMapping::query()->whereKey($submission->mapping_id)->first()
            : FormMapping::query()
                ->where('form_type_id', $submission->form_type_id)
                ->where('year', $submission->year)
                ->orderByDesc('id')
                ->first();

        if (!$mapping) {
            return $this->fail('No mapping found for this submission.', null, 422);
        }

        $allowedKeys = array_keys($mapping->mapping_json ?? []);
        $answers = $payload['answers'] ?? [];
        $snapshots = $payload['snapshots'] ?? [];

        $updated = 0;
        $rejected = [];

        foreach ($answers as $fieldKey => $value) {
            if (!in_array($fieldKey, $allowedKeys, true)) {
                $rejected[] = $fieldKey;
                continue;
            }

            $row = SubmissionAnswer::query()->firstOrNew([
                'submission_id' => $submission->id,
                'field_key' => $fieldKey,
            ]);

            $row->form_type_id = $submission->form_type_id;
            $row->year = $submission->year;

            // reset all value columns
            $row->value_text = null;
            $row->value_number = null;
            $row->value_bool = null;
            $row->value_json = null;

            // normalize into correct value column
            if (is_bool($value)) {
                $row->value_bool = $value;
            } elseif (is_int($value) || is_float($value)) {
                $row->value_number = $value;
            } elseif (is_array($value) || is_object($value)) {
                $row->value_json = $value;
            } else {
                $row->value_text = is_null($value) ? null : (string) $value;
            }

            if (isset($snapshots[$fieldKey]) && is_array($snapshots[$fieldKey])) {
                $ss = $snapshots[$fieldKey];
                $row->label = $ss['label'] ?? $row->label;
                $row->type = $ss['type'] ?? $row->type;
                $row->option_key = $ss['option_key'] ?? $row->option_key;
                $row->option_label = $ss['option_label'] ?? $row->option_label;
            }

            $row->save();
            $updated++;
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

        $submission->status = 'submitted';
        $submission->submitted_at = Carbon::now();
        $submission->save();

        return $this->ok($submission, 'Submitted');
    }
}
