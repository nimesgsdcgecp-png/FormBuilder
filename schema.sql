-- ==============================================================================
-- FormBuilder3 - Physical Database Schema (PostgreSQL 17)
-- Updated based on Data Dictionary
-- ==============================================================================

-- 1. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE
);

-- 2. Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    parent_role_id UUID REFERENCES roles(id)
);

-- 3. Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description VARCHAR(255),
    category VARCHAR(255) NOT NULL,
    feature_id VARCHAR(255)
);

-- 4. Modules table
CREATE TABLE modules (
    id UUID PRIMARY KEY,
    module_name VARCHAR(255) NOT NULL,
    prefix VARCHAR(255),
    icon_css VARCHAR(255),
    active BOOLEAN,
    is_parent BOOLEAN,
    is_sub_parent BOOLEAN,
    parent_id UUID,
    sub_parent_id UUID,
    created_at TIMESTAMP WITHOUT TIME ZONE
);

-- 5. User-Form-Role assignments
CREATE TABLE user_form_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    form_id UUID,
    assigned_by VARCHAR(255),
    assigned_at TIMESTAMP WITHOUT TIME ZONE
);

-- 6. Role-Permission mapping
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 7. Role-Module mapping
CREATE TABLE role_modules (
    id UUID PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id),
    module_id UUID NOT NULL REFERENCES modules(id)
);

-- 8. Forms table
CREATE TABLE forms (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(255) NOT NULL,
    code_locked BOOLEAN NOT NULL,
    allow_edit_response BOOLEAN NOT NULL,
    public_share_token VARCHAR(255) UNIQUE,
    target_table_name VARCHAR(255),
    approval_chain TEXT,
    issued_by_username VARCHAR(255),
    is_deleted BOOLEAN NOT NULL,
    owner_id UUID REFERENCES users(id),
    creator_id UUID REFERENCES users(id),
    approved_by_id UUID REFERENCES users(id),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 9. Form Versions table
CREATE TABLE form_versions (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES forms(id),
    version_number INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    change_log TEXT,
    definition_json JSONB NOT NULL,
    rules TEXT,
    activated_by VARCHAR(255),
    activated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_form_id_version UNIQUE(form_id, version_number)
);

-- 10. Form Fields table
CREATE TABLE form_fields (
    id UUID PRIMARY KEY,
    form_version_id UUID NOT NULL REFERENCES form_versions(id),
    field_key VARCHAR(255) NOT NULL,
    label TEXT NOT NULL,
    field_type VARCHAR(255) NOT NULL,
    is_required BOOLEAN NOT NULL,
    is_read_only BOOLEAN NOT NULL,
    is_hidden BOOLEAN NOT NULL,
    is_disabled BOOLEAN NOT NULL,
    is_multi_select BOOLEAN NOT NULL,
    default_value VARCHAR(255),
    help_text TEXT,
    calculation_formula TEXT,
    display_order INTEGER NOT NULL,
    field_options TEXT,
    parent_column_name VARCHAR(255),
    config_json JSONB,
    validation_rules JSONB,
    CONSTRAINT uq_form_version_field UNIQUE(form_version_id, field_key)
);

-- 11. Field Validations table
CREATE TABLE field_validations (
    id UUID PRIMARY KEY,
    form_version_id UUID NOT NULL REFERENCES form_versions(id),
    field_key VARCHAR(255),
    validation_type VARCHAR(255) NOT NULL,
    scope VARCHAR(255) NOT NULL,
    expression TEXT NOT NULL,
    error_message TEXT NOT NULL,
    execution_order INTEGER NOT NULL
);

-- 12. Form Submission Metadata table
CREATE TABLE form_submission_meta (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL,
    form_version_id UUID NOT NULL,
    submission_table VARCHAR(255) NOT NULL,
    submission_row_id UUID NOT NULL,
    status VARCHAR(255) NOT NULL,
    submitted_by VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 13. Workflow Instances table
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY,
    form_id UUID NOT NULL REFERENCES forms(id),
    creator_id UUID NOT NULL REFERENCES users(id),
    target_builder_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(255),
    total_steps INTEGER,
    current_step_index INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

-- 14. Workflow Steps table
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES workflow_instances(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    step_index INTEGER,
    status VARCHAR(255),
    comments TEXT,
    decided_at TIMESTAMP WITHOUT TIME ZONE
);

-- 15. Audit Logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255),
    resource_id VARCHAR(255),
    details TEXT,
    deleted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE
);

-- 16. Level Up Requests table
CREATE TABLE level_up_requests (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(255) NOT NULL,
    requested_at TIMESTAMP WITHOUT TIME ZONE,
    decided_by VARCHAR(255),
    decided_at TIMESTAMP WITHOUT TIME ZONE
);

-- 17. System Configurations table
CREATE TABLE system_configurations (
    id UUID PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value VARCHAR(255),
    description VARCHAR(255)
);