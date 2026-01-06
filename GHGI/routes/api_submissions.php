<?php

// Paste this into routes/api.php (or require this file from routes/api.php)

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\SubmissionsController;
use App\Http\Controllers\Admin\FormAnalyticsController;

Route::middleware(['auth:sanctum', 'role:ADMIN'])->prefix('api/admin')->group(function () {
    // Submissions CRUD
    Route::get('/submissions', [SubmissionsController::class, 'index']);
    Route::post('/submissions', [SubmissionsController::class, 'store']);
    Route::get('/submissions/{submission}', [SubmissionsController::class, 'show']);
    Route::patch('/submissions/{submission}', [SubmissionsController::class, 'update']);
    Route::delete('/submissions/{submission}', [SubmissionsController::class, 'destroy']);

    // Answers + submit
    Route::patch('/submissions/{submission}/answers', [SubmissionsController::class, 'upsertAnswers']);
    Route::post('/submissions/{submission}/submit', [SubmissionsController::class, 'submit']);

    // Analytics
    Route::get('/forms/{formTypeId}/summary', [FormAnalyticsController::class, 'summary']);
    Route::get('/forms/{formTypeId}/questions/{fieldKey}/summary', [FormAnalyticsController::class, 'questionSummary']);
    Route::get('/forms/{formTypeId}/individual', [FormAnalyticsController::class, 'individualIndex']);
});
