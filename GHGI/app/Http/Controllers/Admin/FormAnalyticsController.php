<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\FormMapping;
use App\Models\Submission;
use App\Models\SubmissionAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class FormAnalyticsController extends ApiController
{
    public function summary(Request $request, int $formTypeId)
    {
        $year = (int) $request->get('year', date('Y'));

        $mapping = FormMapping::query()
            ->where('form_type_id', $formTypeId)
            ->where('year', $year)
            ->orderByDesc('id')
            ->first();

        if (!$mapping) {
            return $this->fail('No mapping found for this form/year.', ['form_type_id' => $formTypeId, 'year' => $year], 422);
        }

        $fieldKeys = array_keys($mapping->mapping_json ?? []);

        $totalSubmissions = Submission::query()
            ->where('form_type_id', $formTypeId)
            ->where('year', $year)
            ->whereIn('status', ['submitted', 'reviewed'])
            ->count();

        $fields = [];

        foreach ($fieldKeys as $fieldKey) {
            $base = SubmissionAnswer::query()
                ->where('form_type_id', $formTypeId)
                ->where('year', $year)
                ->where('field_key', $fieldKey);

            $responseCount = (clone $base)->where(function ($q) {
                $q->whereNotNull('value_text')
                  ->orWhereNotNull('value_number')
                  ->orWhereNotNull('value_bool')
                  ->orWhereNotNull('value_json')
                  ->orWhereNotNull('option_key');
            })->distinct('submission_id')->count('submission_id');

            // For now: treat as "text-like" unless option fields are present
            $optionCounts = (clone $base)
                ->whereNotNull('option_label')
                ->selectRaw('COALESCE(option_label, option_key) as k, COUNT(*) as c')
                ->groupBy('k')
                ->orderByDesc('c')
                ->limit(20)
                ->get();

            $samples = (clone $base)
                ->whereNotNull('value_text')
                ->orderByDesc('id')
                ->limit(20)
                ->pluck('value_text');

            $fields[] = [
                'field_key' => $fieldKey,
                'label' => $this->titleFromKey($fieldKey),
                'response_count' => $responseCount,
                'option_counts' => $optionCounts,
                'samples' => $samples,
            ];
        }

        return $this->ok([
            'form_type_id' => $formTypeId,
            'year' => $year,
            'total_submissions' => $totalSubmissions,
            'fields' => $fields,
        ]);
    }

    public function questionSummary(Request $request, int $formTypeId, string $fieldKey)
    {
        $year = (int) $request->get('year', date('Y'));

        $base = SubmissionAnswer::query()
            ->where('form_type_id', $formTypeId)
            ->where('year', $year)
            ->where('field_key', $fieldKey);

        $responseCount = (clone $base)->where(function ($q) {
            $q->whereNotNull('value_text')
              ->orWhereNotNull('value_number')
              ->orWhereNotNull('value_bool')
              ->orWhereNotNull('value_json')
              ->orWhereNotNull('option_key');
        })->distinct('submission_id')->count('submission_id');

        $optionCounts = (clone $base)
            ->whereNotNull('option_label')
            ->selectRaw('COALESCE(option_label, option_key) as k, COUNT(*) as c')
            ->groupBy('k')
            ->orderByDesc('c')
            ->get();

        $textSamples = (clone $base)
            ->whereNotNull('value_text')
            ->orderByDesc('id')
            ->limit(200)
            ->pluck('value_text');

        $numStats = (clone $base)
            ->whereNotNull('value_number')
            ->selectRaw('MIN(value_number) as min, MAX(value_number) as max, AVG(value_number) as avg, SUM(value_number) as sum, COUNT(*) as n')
            ->first();

        return $this->ok([
            'form_type_id' => $formTypeId,
            'year' => $year,
            'field_key' => $fieldKey,
            'label' => $this->titleFromKey($fieldKey),
            'response_count' => $responseCount,
            'option_counts' => $optionCounts,
            'text_samples' => $textSamples,
            'number_stats' => $numStats,
        ]);
    }

    public function individualIndex(Request $request, int $formTypeId)
    {
        $year = (int) $request->get('year', date('Y'));
        $perPage = (int) $request->get('per_page', 20);

        $rows = Submission::query()
            ->where('form_type_id', $formTypeId)
            ->where('year', $year)
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->ok($rows);
    }

    private function titleFromKey(string $key): string
    {
        $key = str_replace(['-', '_'], ' ', $key);
        $key = preg_replace('/\s+/', ' ', trim($key));
        return ucwords($key);
    }
}
