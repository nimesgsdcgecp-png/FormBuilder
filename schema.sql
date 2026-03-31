-- ==============================================================================
-- FormBuilder3 - Physical Database Schema (PostgreSQL 17)
-- ==============================================================================
-- Notes:
-- No Liquibase/Flyway required.
-- Run these queries directly against the PostgreSQL 17 database.
-- ==============================================================================

-- 1. form: Stores the logical form container.
CREATE TABLE form (
    id UUID PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL, -- DRAFT, PUBLISHED, ARCHIVED
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Column hints (Comments) for form
COMMENT ON COLUMN form.id IS 'Primary identifier for the logical form; stable across all versions.';
COMMENT ON COLUMN form.code IS 'Human-readable and system-stable identifier; used for submission table naming and API references. Must never change once published.';
COMMENT ON COLUMN form.name IS 'Display name of the form shown in UI listings and selectors.';
COMMENT ON COLUMN form.description IS 'Optional explanatory text describing the business purpose of the form.';
COMMENT ON COLUMN form.status IS 'Lifecycle state controlling visibility and editability (DRAFT, PUBLISHED, ARCHIVED).';
COMMENT ON COLUMN form.created_by IS 'Identifier of the user who created the form.';
COMMENT ON COLUMN form.created_at IS 'Timestamp when the form was first created.';
COMMENT ON COLUMN form.updated_at IS 'Timestamp of the last metadata change to the form (not submissions).';

-- Create Index for form
CREATE INDEX idx_form_code ON form(code);

-- ------------------------------------------------------------------------------

-- 2. form_version: Stores immutable form definitions.
CREATE TABLE form_version (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    definition_json JSONB NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_form_version UNIQUE(form_id, version_number)
);

-- Column hints (Comments) for form_version
COMMENT ON COLUMN form_version.id IS 'Unique identifier for a specific immutable version of a form.';
COMMENT ON COLUMN form_version.form_id IS 'Reference to the parent logical form.';
COMMENT ON COLUMN form_version.version_number IS 'Sequential version number, monotonically increasing per form.';
COMMENT ON COLUMN form_version.is_active IS 'Indicates which version is currently used for new submissions.';
COMMENT ON COLUMN form_version.definition_json IS 'Serialized snapshot of the full form structure (layout, sections, ordering, UI hints).';
COMMENT ON COLUMN form_version.created_by IS 'Identifier of the user who published this version.';
COMMENT ON COLUMN form_version.created_at IS 'Timestamp when this version was created and locked.';

-- Create Index for form_version
CREATE INDEX idx_form_version_active ON form_version(form_id, is_active);

-- ------------------------------------------------------------------------------

-- 3. form_field: Represents individual fields within a form version.
CREATE TABLE form_field (
    id UUID PRIMARY KEY,
    form_version_id UUID NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN NOT NULL,
    is_read_only BOOLEAN NOT NULL,
    default_value TEXT,
    display_order INTEGER NOT NULL,
    config_json JSONB,
    CONSTRAINT uq_form_field UNIQUE(form_version_id, field_key)
);

-- Column hints (Comments) for form_field
COMMENT ON COLUMN form_field.id IS 'Unique identifier of the field definition.';
COMMENT ON COLUMN form_field.form_version_id IS 'Identifies the exact form version this field belongs to.';
COMMENT ON COLUMN form_field.field_key IS 'Stable programmatic identifier; directly maps to a column name in the submission table.';
COMMENT ON COLUMN form_field.label IS 'Human-readable label displayed on the form UI.';
COMMENT ON COLUMN form_field.field_type IS 'Field control type (TEXT, NUMBER, DATE, DROPDOWN, etc.).';
COMMENT ON COLUMN form_field.is_required IS 'Indicates whether the field must be populated for a valid submission.';
COMMENT ON COLUMN form_field.is_read_only IS 'Indicates whether the field is displayed but not editable at runtime.';
COMMENT ON COLUMN form_field.default_value IS 'Default value applied when the form is initially rendered.';
COMMENT ON COLUMN form_field.display_order IS 'Determines ordering of fields within the form or section.';
COMMENT ON COLUMN form_field.config_json IS 'Field-specific configuration such as placeholder text, dropdown options, or UI hints.';

-- ------------------------------------------------------------------------------

-- 4. field_validation: Stores validation and conditional validation rules.
CREATE TABLE field_validation (
    id UUID PRIMARY KEY,
    form_version_id UUID NOT NULL,
    field_key VARCHAR(100),
    validation_type VARCHAR(50) NOT NULL,
    expression TEXT NOT NULL,
    error_message VARCHAR(255) NOT NULL,
    execution_order INTEGER NOT NULL,
    scope VARCHAR(20) NOT NULL -- FIELD, FORM
);

-- Column hints (Comments) for field_validation
COMMENT ON COLUMN field_validation.id IS 'Unique identifier for a validation rule.';
COMMENT ON COLUMN field_validation.form_version_id IS 'Indicates the form version where this validation applies.';
COMMENT ON COLUMN field_validation.field_key IS 'Target field for the validation; NULL for form-level validations.';
COMMENT ON COLUMN field_validation.validation_type IS 'Logical classification of the rule (REQUIRED, REGEX, CONDITIONAL, CUSTOM).';
COMMENT ON COLUMN field_validation.expression IS 'Boolean expression evaluated against submission data to determine validity.';
COMMENT ON COLUMN field_validation.error_message IS 'Message shown to the user when validation fails.';
COMMENT ON COLUMN field_validation.execution_order IS 'Determines evaluation sequence when multiple validations exist.';
COMMENT ON COLUMN field_validation.scope IS 'Defines whether validation applies at FIELD level or FORM level.';

-- ------------------------------------------------------------------------------

-- 5. form_submission_meta: Stores submission metadata only.
CREATE TABLE form_submission_meta (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    form_version_id UUID NOT NULL,
    submission_table VARCHAR(255) NOT NULL,
    submission_row_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL, -- DRAFT, SUBMITTED
    submitted_by VARCHAR(100),
    submitted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);

-- Column hints (Comments) for form_submission_meta
COMMENT ON COLUMN form_submission_meta.id IS 'Unique identifier for the submission metadata record.';
COMMENT ON COLUMN form_submission_meta.form_id IS 'Logical form to which this submission belongs.';
COMMENT ON COLUMN form_submission_meta.form_version_id IS 'Exact form version used to render and validate this submission.';
COMMENT ON COLUMN form_submission_meta.submission_table IS 'Name of the physical table where submission data is stored.';
COMMENT ON COLUMN form_submission_meta.submission_row_id IS 'Primary key of the corresponding row in the submission table.';
COMMENT ON COLUMN form_submission_meta.status IS 'Submission state (DRAFT or SUBMITTED).';
COMMENT ON COLUMN form_submission_meta.submitted_by IS 'Identifier of the user who submitted the form.';
COMMENT ON COLUMN form_submission_meta.submitted_at IS 'Timestamp when the form was finally submitted.';
COMMENT ON COLUMN form_submission_meta.created_at IS 'Timestamp when the submission record was first created (including drafts).';

-- Create Index for form_submission_meta
CREATE INDEX idx_form_sub_meta_status ON form_submission_meta(form_id, status);

-- ------------------------------------------------------------------------------
-- Example dynamic submission table structure (Do NOT create universally, this is per-form)
-- e.g. form_data_employee_onboarding
-- 
-- CREATE TABLE form_data_employee_onboarding (
--     id UUID PRIMARY KEY,
--     form_version_id UUID NOT NULL,
--     employee_name TEXT,
--     date_of_joining DATE,
--     salary NUMERIC,
--     is_draft BOOLEAN NOT NULL,
--     created_at TIMESTAMP NOT NULL,
--     updated_at TIMESTAMP NOT NULL
-- );
--
-- CREATE INDEX idx_form_data_onboarding_created ON form_data_employee_onboarding(created_at);
-- CREATE INDEX idx_form_data_onboarding_draft ON form_data_employee_onboarding(is_draft);
