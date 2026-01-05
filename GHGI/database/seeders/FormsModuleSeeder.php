<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FormType;
use App\Models\FormSchemaVersion;
use App\Models\FormMapping;

class FormsModuleSeeder extends Seeder
{
    public function run(): void
    {
        $year = 2023;

        // ----------------------------
        // 1) Stat Comb-Residential Data
        // ----------------------------
        $residential = FormType::updateOrCreate(
            ['key' => 'stat-comb-residential'],
            [
                'name' => 'Stat Comb-Residential Data',
                'sector_key' => 'stationary_combustion',
                'description' => 'Stationary combustion activity data (residential).',
                'is_active' => true,
            ]
        );

        [$resSchema, $resUi] = $this->schemaResidential();

        FormSchemaVersion::updateOrCreate(
            ['form_type_id' => $residential->id, 'year' => $year, 'version' => 1],
            [
                'schema_json' => $resSchema,
                'ui_json' => $resUi,
                'status' => 'active',
            ]
        );

        FormMapping::updateOrCreate(
            ['form_type_id' => $residential->id, 'year' => $year],
            [
                'mapping_json' => (object)[], // field_key -> activity_input_key (Engine mapping)
            ]
        );

        // ----------------------------
        // 2) Stat Comb-Commercial Data
        // ----------------------------
        $commercial = FormType::updateOrCreate(
            ['key' => 'stat-comb-commercial'],
            [
                'name' => 'Stat Comb-Commercial Data',
                'sector_key' => 'stationary_combustion',
                'description' => 'Stationary combustion activity data (commercial).',
                'is_active' => true,
            ]
        );

        [$comSchema, $comUi] = $this->schemaCommercial();

        FormSchemaVersion::updateOrCreate(
            ['form_type_id' => $commercial->id, 'year' => $year, 'version' => 1],
            [
                'schema_json' => $comSchema,
                'ui_json' => $comUi,
                'status' => 'active',
            ]
        );

        FormMapping::updateOrCreate(
            ['form_type_id' => $commercial->id, 'year' => $year],
            [
                'mapping_json' => (object)[], // field_key -> activity_input_key (Engine mapping)
            ]
        );
    }

    private function schemaResidential(): array
    {
        $barangays = ['Barangay 1', 'Barangay 2', 'Barangay 3']; // demo placeholder
        $typeOfData = ['Individual Household Surveys', 'National Census Averages', 'Other'];
        $applications = ['Cooking', 'Lighting', 'Heating', 'Generators', 'Other'];
        $fuelTypes = ['LPG', 'Kerosene', 'Diesel', 'Gasoline', 'Biomass/Wood', 'Charcoal', 'Natural Gas', 'Other'];
        $units = ['litres', 'kg', 'tonnes', 'm3'];

        $schema = [
            'title' => 'Stat Comb-Residential Data',
            'kind' => 'residential',
            'version' => 1,
            'fields' => [
                ['key' => 'district_or_barangay', 'label' => 'District or Barangay', 'type' => 'select', 'required' => true, 'options' => $barangays],
                ['key' => 'data_source_identifier', 'label' => 'Data Source Identifier', 'type' => 'text', 'required' => true, 'placeholder' => 'e.g. Residential Survey Number'],
                ['key' => 'type_of_data', 'label' => 'Type of Data', 'type' => 'select', 'required' => true, 'options' => $typeOfData],
                ['key' => 'application', 'label' => 'Application', 'type' => 'select', 'required' => true, 'options' => $applications, 'placeholder' => 'e.g. cooking, lighting, generators'],
                ['key' => 'fuel_type', 'label' => 'Fuel Type', 'type' => 'select', 'required' => true, 'options' => $fuelTypes],
                ['key' => 'annual_total_consumption', 'label' => 'Annual Total Consumption', 'type' => 'number', 'required' => true, 'min' => 0],
                ['key' => 'units', 'label' => 'Units', 'type' => 'select', 'required' => true, 'options' => $units, 'help' => 'Metric only'],
                ['key' => 'data_uncertainty', 'label' => 'Data Uncertainty', 'type' => 'text', 'required' => false, 'help' => 'See guidance document for source/quality management'],
                ['key' => 'account_or_file_code', 'label' => 'Account or File Code Where Data is Stored', 'type' => 'text', 'required' => false],
                ['key' => 'date_transcribed', 'label' => 'Date Transcribed / Date Sourced', 'type' => 'date', 'required' => false],
                ['key' => 'ownership_storage_location', 'label' => 'Ownership and Storage Location of Data', 'type' => 'text', 'required' => false, 'placeholder' => 'e.g. LGU server, Government office, organization'],
                ['key' => 'qc_reference', 'label' => 'Corresponding Quality Control (QC) Reference', 'type' => 'text', 'required' => false],
                ['key' => 'basis_of_data_uncertainty', 'label' => 'Basis of Data Uncertainty', 'type' => 'text', 'required' => false],
            ],
        ];

        $ui = [
            'title' => 'Stat Comb-Residential Data',
            'sections' => [
                [
                    'key' => 'activity_data',
                    'label' => 'Activity Data',
                    'field_keys' => [
                        'district_or_barangay',
                        'data_source_identifier',
                        'type_of_data',
                        'application',
                        'fuel_type',
                        'annual_total_consumption',
                        'units',
                    ],
                ],
                [
                    'key' => 'quality_and_traceability',
                    'label' => 'Quality & Traceability',
                    'field_keys' => [
                        'data_uncertainty',
                        'basis_of_data_uncertainty',
                        'account_or_file_code',
                        'date_transcribed',
                        'ownership_storage_location',
                        'qc_reference',
                    ],
                ],
            ],
            'ui' => [
                'layout' => 'single_column',
                'submit_label' => 'Save Entry',
            ],
        ];

        return [$schema, $ui];
    }

    private function schemaCommercial(): array
    {
        $barangays = ['Barangay 1', 'Barangay 2', 'Barangay 3']; // demo placeholder
        $typeOfData = ['Individual Business Surveys', 'National Census Averages', 'Other'];
        $applications = ['Cooking', 'Lighting', 'Heating', 'Generators', 'Other'];
        $fuelTypes = ['LPG', 'Kerosene', 'Diesel', 'Gasoline', 'Biomass/Wood', 'Charcoal', 'Natural Gas', 'Other'];
        $units = ['litres', 'kg', 'tonnes', 'm3'];

        $schema = [
            'title' => 'Stat Comb-Commercial Data',
            'kind' => 'commercial',
            'version' => 1,
            'fields' => [
                ['key' => 'district_or_barangay', 'label' => 'District or Barangay', 'type' => 'select', 'required' => true, 'options' => $barangays],
                ['key' => 'data_source_identifier', 'label' => 'Data Source Identifier', 'type' => 'text', 'required' => true, 'placeholder' => 'e.g. commercial fuel use survey ID'],
                ['key' => 'type_of_data', 'label' => 'Type of Data', 'type' => 'select', 'required' => true, 'options' => $typeOfData],
                ['key' => 'application', 'label' => 'Application', 'type' => 'select', 'required' => true, 'options' => $applications, 'placeholder' => 'e.g. cooking, heating, generators'],
                ['key' => 'fuel_type', 'label' => 'Fuel Type', 'type' => 'select', 'required' => true, 'options' => $fuelTypes],
                ['key' => 'annual_total_consumption', 'label' => 'Annual Total Consumption', 'type' => 'number', 'required' => true, 'min' => 0],
                ['key' => 'units', 'label' => 'Units', 'type' => 'select', 'required' => true, 'options' => $units, 'help' => 'Metric only'],
                ['key' => 'data_uncertainty', 'label' => 'Data Uncertainty', 'type' => 'text', 'required' => false, 'help' => 'See guidance document for source/quality management'],
                ['key' => 'account_or_file_code', 'label' => 'Account or File Code Where Data is Stored', 'type' => 'text', 'required' => false],
                ['key' => 'date_transcribed', 'label' => 'Date Transcribed / Date Sourced', 'type' => 'date', 'required' => false],
                ['key' => 'ownership_storage_location', 'label' => 'Ownership and Storage Location of Data', 'type' => 'text', 'required' => false, 'placeholder' => 'e.g. LGU server, Government office, organization'],
                ['key' => 'qc_reference', 'label' => 'Corresponding Quality Control (QC) Reference', 'type' => 'text', 'required' => false],
                ['key' => 'basis_of_data_uncertainty', 'label' => 'Basis of Data Uncertainty', 'type' => 'text', 'required' => false],
            ],
        ];

        $ui = [
            'title' => 'Stat Comb-Commercial Data',
            'sections' => [
                [
                    'key' => 'activity_data',
                    'label' => 'Activity Data',
                    'field_keys' => [
                        'district_or_barangay',
                        'data_source_identifier',
                        'type_of_data',
                        'application',
                        'fuel_type',
                        'annual_total_consumption',
                        'units',
                    ],
                ],
                [
                    'key' => 'quality_and_traceability',
                    'label' => 'Quality & Traceability',
                    'field_keys' => [
                        'data_uncertainty',
                        'basis_of_data_uncertainty',
                        'account_or_file_code',
                        'date_transcribed',
                        'ownership_storage_location',
                        'qc_reference',
                    ],
                ],
            ],
            'ui' => [
                'layout' => 'single_column',
                'submit_label' => 'Save Entry',
            ],
        ];

        return [$schema, $ui];
    }
}
