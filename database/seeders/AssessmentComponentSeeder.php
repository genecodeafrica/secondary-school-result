<?php

namespace Database\Seeders;

use App\Models\AssessmentComponent;
use App\Models\School;
use Illuminate\Database\Seeder;

class AssessmentComponentSeeder extends Seeder
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

        $components = [
            [
                'name' => 'Continuous Assessment 1',
                'code' => 'CA1',
                'maximum_score' => 10,
                'weight' => 10,
                'display_order' => 1,
            ],

            [
                'name' => 'Continuous Assessment 2',
                'code' => 'CA2',
                'maximum_score' => 10,
                'weight' => 10,
                'display_order' => 2,
            ],

            [
                'name' => 'Continuous Assessment 3',
                'code' => 'CA3',
                'maximum_score' => 10,
                'weight' => 10,
                'display_order' => 3,
            ],

            [
                'name' => 'Examination',
                'code' => 'EXAM',
                'maximum_score' => 70,
                'weight' => 70,
                'display_order' => 4,
            ],
        ];

        foreach ($components as $component) {
            AssessmentComponent::updateOrCreate(
                [
                    'school_id' => $school->id,
                    'code' => $component['code'],
                ],
                [
                    'name' => $component['name'],
                    'maximum_score' => $component['maximum_score'],
                    'weight' => $component['weight'],
                    'display_order' => $component['display_order'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info(
            'Assessment components created successfully.'
        );
    }
}