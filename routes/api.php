<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\SchoolSettingsController;
use App\Http\Controllers\ReportCardController;
use App\Http\Controllers\AuthApiController;
use App\Http\Controllers\AcademicDataController;
use App\Http\Controllers\AcademicSessionController;
use App\Http\Controllers\AssessmentComponentController;
use App\Http\Controllers\ResultController;
use App\Http\Controllers\ResultProcessingController;
use App\Http\Controllers\ResultWorkflowController;
use App\Http\Controllers\ScoreController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\StudentPortalController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\ParentController;
use App\Http\Controllers\ParentPortalController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthApiController::class, 'login'])
        ->name('api.auth.login');
});

/*
|--------------------------------------------------------------------------
| Authenticated API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::get('/auth/me', [AuthApiController::class, 'me'])
        ->name('api.auth.me');

    Route::post('/auth/logout', [AuthApiController::class, 'logout'])
        ->name('api.auth.logout');

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */

    Route::get('/dashboard/statistics', [
        DashboardController::class,
        'statistics',
    ])->name('api.dashboard.statistics');

    /*
    |--------------------------------------------------------------------------
    | Student Management
    |--------------------------------------------------------------------------
    */

    Route::get('/students', [
        StudentController::class,
        'index',
    ])->name('api.students.index');

    Route::post('/students', [
        StudentController::class,
        'store',
    ])->name('api.students.store');

    Route::get('/students/{studentId}/enrollments', [
        StudentController::class,
        'enrollments',
    ])->whereNumber('studentId')
      ->name('api.students.enrollments');

    Route::post('/students/{studentId}/enrollments', [
        StudentController::class,
        'storeEnrollment',
    ])->whereNumber('studentId')
      ->name('api.students.enrollments.store');

    Route::patch('/students/{studentId}/status', [
        StudentController::class,
        'updateStatus',
    ])->whereNumber('studentId')
      ->name('api.students.status');

    Route::get('/students/{studentId}', [
        StudentController::class,
        'show',
    ])->whereNumber('studentId')
      ->name('api.students.show');

    Route::put('/students/{studentId}', [
        StudentController::class,
        'update',
    ])->whereNumber('studentId')
      ->name('api.students.update');

    /*
    |--------------------------------------------------------------------------
    | Academic Sessions and Terms
    |--------------------------------------------------------------------------
    */

    // Existing academic data endpoints
    Route::get('/academic/sessions', [
        AcademicDataController::class,
        'sessions',
    ])->name('api.academic.sessions');

    Route::get('/academic/sessions/{academicSessionId}/terms', [
        AcademicDataController::class,
        'terms',
    ])->whereNumber('academicSessionId')
      ->name('api.academic.sessions.terms');

    // Academic session management
    Route::get('/academic-sessions', [
        AcademicSessionController::class,
        'index',
    ])->name('api.academic-sessions.index');

    Route::post('/academic-sessions', [
        AcademicSessionController::class,
        'store',
    ])->name('api.academic-sessions.store');

    Route::put('/academic-sessions/{academicSessionId}', [
        AcademicSessionController::class,
        'update',
    ])->whereNumber('academicSessionId')
      ->name('api.academic-sessions.update');

    Route::patch('/academic-sessions/{academicSessionId}/status', [
        AcademicSessionController::class,
        'updateStatus',
    ])->whereNumber('academicSessionId')
      ->name('api.academic-sessions.status');

    // Term management
    Route::post('/academic-sessions/{academicSessionId}/terms', [
        AcademicSessionController::class,
        'storeTerm',
    ])->whereNumber('academicSessionId')
      ->name('api.academic-sessions.terms.store');

    Route::put('/academic-terms/{termId}', [
        AcademicSessionController::class,
        'updateTerm',
    ])->whereNumber('termId')
      ->name('api.academic-terms.update');

    Route::patch('/academic-terms/{termId}/status', [
        AcademicSessionController::class,
        'updateTermStatus',
    ])->whereNumber('termId')
      ->name('api.academic-terms.status');

    /*
    |--------------------------------------------------------------------------
    | Class Management and Class Subjects
    |--------------------------------------------------------------------------
    */

    Route::get('/academic/classes', [
        AcademicDataController::class,
        'classes',
    ])->name('api.academic.classes');

    Route::get('/academic/classes/{classId}/subjects', [
        AcademicDataController::class,
        'subjects',
    ])->whereNumber('classId')
      ->name('api.academic.classes.subjects');

    /*
    |--------------------------------------------------------------------------
    | Subject Management
    |--------------------------------------------------------------------------
    */

    Route::get('/subjects', [
        SubjectController::class,
        'index',
    ])->name('api.subjects.index');

    Route::post('/subjects', [
        SubjectController::class,
        'store',
    ])->name('api.subjects.store');

    Route::get('/subjects/{subjectId}', [
        SubjectController::class,
        'show',
    ])->whereNumber('subjectId')
      ->name('api.subjects.show');

    Route::put('/subjects/{subjectId}', [
        SubjectController::class,
        'update',
    ])->whereNumber('subjectId')
      ->name('api.subjects.update');

    Route::patch('/subjects/{subjectId}', [
        SubjectController::class,
        'update',
    ])->whereNumber('subjectId')
      ->name('api.subjects.patch');

    Route::patch('/subjects/{subjectId}/status', [
        SubjectController::class,
        'updateStatus',
    ])->whereNumber('subjectId')
      ->name('api.subjects.status');

    /*
    |--------------------------------------------------------------------------
    | Class-Subject Assignments
    |--------------------------------------------------------------------------
    */

    Route::get('/subjects/{subjectId}/assignments', [
        SubjectController::class,
        'assignments',
    ])->whereNumber('subjectId')
      ->name('api.subjects.assignments');

    Route::put('/subjects/{subjectId}/assignments', [
        SubjectController::class,
        'syncAssignments',
    ])->whereNumber('subjectId')
      ->name('api.subjects.assignments.sync');

    /*
    |--------------------------------------------------------------------------
    | Teacher Management
    |--------------------------------------------------------------------------
    */

    Route::get('/teachers', [
        TeacherController::class,
        'index',
    ])->name('api.teachers.index');

    Route::post('/teachers', [
        TeacherController::class,
        'store',
    ])->name('api.teachers.store');

    Route::get('/teachers/{teacherId}', [
        TeacherController::class,
        'show',
    ])->whereNumber('teacherId')
      ->name('api.teachers.show');

    Route::put('/teachers/{teacherId}', [
        TeacherController::class,
        'update',
    ])->whereNumber('teacherId')
      ->name('api.teachers.update');

    Route::patch('/teachers/{teacherId}/status', [
        TeacherController::class,
        'updateStatus',
    ])->whereNumber('teacherId')
      ->name('api.teachers.status');

    Route::get('/teachers/{teacherId}/assignments', [
        TeacherController::class,
        'assignments',
    ])->whereNumber('teacherId')
      ->name('api.teachers.assignments');

    Route::put('/teachers/{teacherId}/assignments', [
        TeacherController::class,
        'syncAssignments',
    ])->whereNumber('teacherId')
      ->name('api.teachers.assignments.sync');

    /*
    |--------------------------------------------------------------------------
    | Parent Management
    |--------------------------------------------------------------------------
    */

    Route::get('/parents', [
        ParentController::class,
        'index',
    ])->name('api.parents.index');

    Route::post('/parents', [
        ParentController::class,
        'store',
    ])->name('api.parents.store');

    Route::get('/parents/{parentId}', [
        ParentController::class,
        'show',
    ])->whereNumber('parentId')
      ->name('api.parents.show');

    Route::put('/parents/{parentId}', [
        ParentController::class,
        'update',
    ])->whereNumber('parentId')
      ->name('api.parents.update');

    Route::patch('/parents/{parentId}/status', [
        ParentController::class,
        'updateStatus',
    ])->whereNumber('parentId')
      ->name('api.parents.status');

    /*
    |--------------------------------------------------------------------------
    | Parent Portal
    |--------------------------------------------------------------------------
    */

    Route::get('/parent/portal', [
        ParentPortalController::class,
        'index',
    ])->name('api.parent.portal');

    /*
    |--------------------------------------------------------------------------
    | Student Portal
    |--------------------------------------------------------------------------
    */

    Route::get('/student/portal', [
        StudentPortalController::class,
        'index',
    ])->name('api.student.portal');

    /*
    |--------------------------------------------------------------------------
    | Academic Student Endpoints
    |--------------------------------------------------------------------------
    */

    Route::get('/academic/students', [
        AcademicDataController::class,
        'students',
    ])->name('api.academic.students');

    Route::get('/academic/students/{studentId}/enrollments', [
        AcademicDataController::class,
        'studentEnrollments',
    ])->whereNumber('studentId')
      ->name('api.academic.students.enrollments');

    /*
    |--------------------------------------------------------------------------
    | Assessment Components
    |--------------------------------------------------------------------------
    */

    Route::get('/academic/assessment-components', [
        AcademicDataController::class,
        'assessmentComponents',
    ])->name('api.academic.assessment-components');

        // Assessment component management
    Route::get('/assessment-components', [
        AssessmentComponentController::class,
        'index',
    ]);

    Route::post('/assessment-components', [
        AssessmentComponentController::class,
        'store',
    ]);

    Route::put('/assessment-components/{componentId}', [
        AssessmentComponentController::class,
        'update',
    ]);

    Route::patch('/assessment-components/{componentId}/status', [
        AssessmentComponentController::class,
        'updateStatus',
    ]);

    /*
    |--------------------------------------------------------------------------
    | Teacher Profile and Assignments
    |--------------------------------------------------------------------------
    */

    Route::get('/academic/teacher/profile', [
        AcademicDataController::class,
        'myTeacherProfile',
    ])->name('api.academic.teacher.profile');

    Route::get('/academic/teacher/assignments', [
        AcademicDataController::class,
        'teacherAssignments',
    ])->name('api.academic.teacher.assignments');

    /*
    |--------------------------------------------------------------------------
    | Score Entry
    |--------------------------------------------------------------------------
    */

    Route::post('/scores', [
        ScoreController::class,
        'store',
    ])->name('api.scores.store');

    /*
    |--------------------------------------------------------------------------
    | Result Processing
    |--------------------------------------------------------------------------
    */

    Route::post('/results/process', [
        ResultProcessingController::class,
        'process',
    ])->name('api.results.process');
    
    Route::post('/results/process-class', [
        ResultProcessingController::class,
        'processClass',
    ])->name('api.results.process-class');

    Route::post('/results/calculate-positions', [
        ResultProcessingController::class,
        'calculatePositions',
    ])->name('api.results.calculate-positions');

    /*
    |--------------------------------------------------------------------------
    | Result Workflow
    |--------------------------------------------------------------------------
    */

    Route::post('/results/submit', [
        ResultWorkflowController::class,
        'submit',
    ])->name('api.results.submit');

    Route::post('/results/review', [
        ResultWorkflowController::class,
        'review',
    ])->name('api.results.review');

    Route::post('/results/approve', [
        ResultWorkflowController::class,
        'approve',
    ])->name('api.results.approve');

    Route::post('/results/reject', [
        ResultWorkflowController::class,
        'reject',
    ])->name('api.results.reject');

    Route::post('/results/publish', [
        ResultWorkflowController::class,
        'publish',
    ])->name('api.results.publish');

    /*
    |--------------------------------------------------------------------------
    | Result Retrieval
    |--------------------------------------------------------------------------
    */

    Route::get('/results/class/list', [
        ResultController::class,
        'classResults',
    ])->name('api.results.class');

    Route::get('/results/student/view', [
        ResultController::class,
        'studentResult',
    ])->name('api.results.student');

    Route::get('/results/{resultId}/report-card', [
        ReportCardController::class,
        'download',
    ])->whereNumber('resultId')
      ->name('api.results.report-card');

    Route::get('/results/{resultId}/details', [
        ResultController::class,
        'details',
    ])->whereNumber('resultId')
      ->name('api.results.details');

    Route::get('/results/{resultId}', [
        ResultController::class,
        'show',
    ])->whereNumber('resultId')
      ->name('api.results.show');

    /*
    |--------------------------------------------------------------------------
    | School Settings
    |--------------------------------------------------------------------------
    */

    Route::get('/school-settings', [
        SchoolSettingsController::class,
        'show',
    ])->name('api.school-settings.show');

    Route::post('/school-settings', [
        SchoolSettingsController::class,
        'update',
    ])->name('api.school-settings.update');
});
