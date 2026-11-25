<?php

namespace App\Http\Controllers;

use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SchoolSettingsController extends Controller
{
    private function school(Request $request): School
    {
        $user = $request->user();

        abort_unless(
            $user && $user->hasRole('School Admin'),
            403,
            'Only the School Admin can manage school settings.'
        );

        abort_unless(
            $user->school_id,
            403,
            'Your account is not assigned to a school.'
        );

        return School::whereKey($user->school_id)->firstOrFail();
    }

    public function show(Request $request): JsonResponse
    {
        $school = $this->school($request);

        return response()->json([
            'success' => true,
            'data' => $school,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $school = $this->school($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('schools', 'code')->ignore($school->id),
            ],
            'address' => ['nullable', 'string', 'max:2000'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        unset($validated['logo']);

        $school->fill($validated);

        if ($request->hasFile('logo')) {
            $oldLogo = $school->logo;

            $path = $request->file('logo')->store(
                'school-logos',
                'public'
            );

            $school->logo = $path;

            if ($oldLogo && Storage::disk('public')->exists($oldLogo)) {
                Storage::disk('public')->delete($oldLogo);
            }
        }

        $school->save();

        return response()->json([
            'success' => true,
            'message' => 'School settings updated successfully.',
            'data' => $school->fresh(),
        ]);
    }
}
