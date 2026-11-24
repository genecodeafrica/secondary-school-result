<?php

namespace Database\Seeders;

use App\Models\Grade;
use App\Models\School;
use Illuminate\Database\Seeder;

class GradeSeeder extends Seeder
{
    public function run(): void
    {
        $school = School::where('code', 'DEMO001')->first();

        if (!$school) {
            $this->command->error(
                'Demo school with code DEMO001 was not found.'
            );

            return;
        }

        $grades = [
            [
                'name' => 'Excellent',
                'code' => 'A',
                'minimum_score' => 75,
                'maximum_score' => 100,
                'remark' => 'Excellent',
                'display_order' => 1,
            ],

            [
                'name' => 'Very Good',
                'code' => 'B',
                'minimum_score' => 70,
                'maximum_score' => 74.99,
                'remark' => 'Very Good',
                'display_order' => 2,
            ],

            [
                'name' => 'Good',
                'code' => 'C',
                'minimum_score' => 60,
                'maximum_score' => 69.99,
                'remark' => 'Good',
                'display_order' => 3,
            ],

            [
                'name' => 'Pass',
                'code' => 'D',
                'minimum_score' => 50,
                'maximum_score' => 59.99,
                'remark' => 'Pass',
                'display_order' => 4,
            ],

            [
                'name' => 'Fair',
                'code' => 'E',
                'minimum_score' => 45,
                'maximum_score' => 49.99,
                'remark' => 'Fair',
                'display_order' => 5,
            ],

            [
                'name' => 'Fail',
                'code' => 'F',
                'minimum_score' => 0,
                'maximum_score' => 44.99,
                'remark' => 'Fail',
                'display_order' => 6,
            ],
        ];

        foreach ($grades as $grade) {
            Grade::updateOrCreate(
                [
                    'school_id' => $school->id,
                    'code' => $grade['code'],
                ],
                [
                    'name' => $grade['name'],
                    'minimum_score' => $grade['minimum_score'],
                    'maximum_score' => $grade['maximum_score'],
                    'remark' => $grade['remark'],
                    'display_order' => $grade['display_order'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info(
            'Grade configuration created successfully.'
        );
    }
}