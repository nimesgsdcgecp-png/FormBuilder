# Form Builder Project Specification

## Project Definition
### 1. Project Task Definition
#### 1.1 Project Title
Configurable Form Builder Platform

#### 1.2 Purpose of the Project
The purpose of creating a form builder is to provide a reusable, configurable mechanism for defining, rendering, validating, and persisting data capture forms without requiring custom backend and frontend development for each new form.

The form builder aims to:
- Eliminate repetitive form-related development effort.
- Enable rapid creation and modification of forms by non-developer users.
- Standardize data capture, validation, and persistence mechanisms.
- Provide operational visibility and manageability of submitted form data.

#### 1.3 Problem Statement
In the absence of a form builder, each new form requires:
- Custom UI development.
- Custom backend validation logic.
- Custom database schema design.
- Custom listing and management screens.

This approach is slow, error-prone, and difficult to maintain. The form builder addresses these issues through configuration-driven form definition and execution.

## 2. Scope Definition
### 2.1 In-Scope
- Visual form creation and editing
- Dynamic form rendering
- Configurable validations and conditional logic
- Table-per-form database persistence
- Submission listing and bulk management
- Authentication and authorization

### 2.2 Explicitly Out of Scope
- Workflow engines
- Analytics and monitoring
- Localization and accessibility features
- PDF generation
- Virus scanning
- Rule engines
- E-signatures
- AI-assisted features
- Documentation deliverables
- Unit and integration testing

## 3. Functional Requirements
### 3.1 Form Definition and Visual Editing
- The system shall provide a browser-based visual editor for creating and modifying forms.
- The editor shall support drag-and-drop placement of fields onto a canvas.
- The editor shall allow reordering of fields and grouping them into sections.
- The editor shall support multi-step (wizard-style) forms using page breaks.

### 3.2 Supported Field Types
- Text (single-line, multi-line)
- Numeric (integer, decimal)
- Date, time, date-time
- Dropdown (single-select, multi-select)
- Radio buttons and checkboxes
- Boolean toggle
- File upload (basic storage)
- Hidden/system fields
- Static elements such as labels and section headers

### 3.3 Field Configuration
- Each field shall support mandatory/optional configuration.
- Fields shall support default values.
- Fields shall support read-only and disabled states.
- Fields shall support place-holder and help text.

### 3.4 Validation Capabilities
- The system shall allow custom validation rules at the field level.
- Validations may reference values of other fields.
- Conditional validations shall be supported based on form state.
- The system shall support form-level validation that executes once all mandatory fields are populated.
- Submission shall be blocked if validation errors exist, with consolidated error feedback.

### 3.5 Conditional Logic
- Fields and sections may be shown or hidden based on conditions.
- Fields may be enabled or disabled conditionally.
- Calculated fields may derive values from other inputs.

### 3.6 Data Persistence
- Each form shall have a dedicated database table.
- Each field shall map to a corresponding table column.
- Submissions shall be timestamped.
- Draft and final submission states shall be supported.
- Schema evolution shall be handled through controlled application-level migrations (no migration tools).

### 3.7 Submission Management
- The system shall provide a grid view listing all submissions of a form.
- The grid shall support sorting, filtering, and pagination.
- Users shall be able to select multiple entries.
- Bulk operations shall include delete and status updates.
- Bulk export to CSV/xlsx shall be supported.

### 3.8 Access Control
- The system shall restrict form creation and editing to authorized users.
- Submission viewing and bulk actions shall be role-controlled.
- Session-based authentication shall be enforced using Spring Security.

## 4. Non-Functional Requirements
### 4.1 Technology Stack
- FrontEnd NextJS app hosted on Node
- Java version shall be 21.
- The backend framework shall be Spring Boot 3.
- Database shall be PostgreSQL 17.

### 4.2 Build and Dependency Management
- Maven shall be used as the build tool.
- Maven profiles shall not be used.

### 4.3 Authentication and Session Management
- NextJS shall use a simplified authentication mechanism suitable only for this project [intentionally non-production-grade].
- Backend authentication shall be session-based.
- JWT shall not be used.

### 4.4 Concurrency and Runtime Constraints
- Virtual threads shall not be used.
- Traditional thread-per-request model shall be assumed.

### 4.5 Database Constraints
- Flyway and Liquibase shall not be used.
- Schema changes shall be managed explicitly within application lifecycle logic.

### 4.6 Frontend Constraints
- JavaScript and jQuery may be integrated where required.
- The system shall be usable in modern desktop browsers.

## 5. Final Outcome Definition
At the conclusion of the project, the system should exhibit the following characteristics:
- Administrators can visually design and publish forms without code changes.
- End users can fill and submit forms rendered dynamically from configuration.
- Submitted data is persisted in dedicated tables per form.
- Submissions can be viewed, filtered, and managed in grid-based screens.
- Validation logic is enforced consistently across UI and backend.
- The platform operates as a reusable internal capability rather than a one-off solution.

## 6. SDLC-Aligned Project Phases, Milestones, and Definition of Done
### Phase 1: Requirements and Architecture Finalization
**Milestones**
- Functional scope finalized
- Non-functional constraints validated
- High-level architecture agreed

**Definition of Done**
- All functional and non-functional requirements are baselined and approved.
- Technology choices are finalized and constrained.

### Phase 2: Core Platform Foundation
**Milestones**
- Backend application skeleton operational
- Frontend SPA shell operational
- Authentication and session handling functional

**Definition of Done**
- Application starts end-to-end with secured access.
- Frontend and backend communicate successfully.

### Phase 3: Form Definition and Visual Editor
**Milestones**
- Visual form editor functional
- Field configuration and layout supported

**Definition of Done**
- Forms can be created, edited, and persisted as definitions.
- Visual changes are reflected in stored configuration.

### Phase 4: Runtime Rendering and Validation
**Milestones**
- Dynamic form rendering implemented
- Field-level and form-level validations enforced

**Definition of Done**
- Forms render correctly at runtime from stored definitions.
- Invalid submissions are consistently rejected.

### Phase 5: Persistence and Submission Management
**Milestones**
- Table-per-form persistence implemented
- Submission grid and bulk operations available

**Definition of Done**
- Submissions are stored in dedicated tables.
- Users can manage entries via grid views and bulk actions.

### Phase 6: Stabilization and Release Readiness
**Milestones**
- Feature completeness achieved
- Performance and stability verified manually

**Definition of Done**
- All in-scope features are functional.
- No known blocking defects remain.
- System is ready for controlled internal use.

---


## Architecture Decisions
### 1. Purpose of This Document
This document captures binding architectural decisions governing system behavior, constraints, and enforcement rules.
This update incorporates explicit resolutions of previously pending decisions.
All decisions in this document are authoritative and must be enforced consistently across frontend, backend, and database layers.

### 2. Validation & Expression Engine Decisions
#### 2.1 Validation Expression Language
**Decision (Updated)**
- Validation expressions shall use a simple boolean expression language.
- Operator symbols shall be used exclusively.

**Details**
- Logical operators: `&&`, `||`, `!`
- Comparison operators: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Parentheses are supported for grouping.
- Expressions reference fields using normalized `field_key` identifiers.
- No functions, method calls, or dynamic execution is permitted.

**Rationale**
Operator symbols are concise, unambiguous, and easier to implement consistently across frontend and backend.

#### 2.2 Null, Missing, and Type Semantics
**Decision (Unchanged)**
- Non-mandatory null or missing field values must not impact expression evaluation.
- Strings shall be auto-coerced to numbers when numeric comparison is required.

#### 2.3 Expression Evaluation Failure Policy
**Decision (Updated)**
- Expression parsing or evaluation failures shall throw an explicit error.
- The error response must include:
  - Reason for failure
  - Expression identifier (if available)
  - Context (field-level or form-level)

**Rationale**
Fail-fast behavior avoids silent data corruption and provides deterministic debugging.

### 3. Form Versioning Semantics
#### 3.1 Draft Submission Rules
**Decision (Unchanged)**
- End users cannot submit drafts against an inactive form version.

#### 3.2 Draft Handling on New Version Activation
**Decision (UPDATED — Reversal)**
- Drafts shall NOT be auto-migrated when a new form version is activated.
- All existing drafts for the previous version shall be dropped.
- Users must be shown a clear warning indicating that their drafts were discarded due to a form update.

**Rationale**
Auto-migration introduces ambiguity and hidden data transformation. Explicit discard with user awareness is safer and clearer.

#### 3.3 Field Type Stability
**Decision (Unchanged)**
- A field’s type cannot be changed between versions.

#### 3.4 Definition of “Live Submissions”
**Decision (Updated)**
A form is considered to have live submissions if and only if:
- There exists at least one active SUBMITTED row in the form’s submission table.

**Explicit Exclusions**
- Drafts do NOT count.
- Soft-deleted submissions do NOT count.

**Rationale**
Ensures operational rules are driven by meaningful, active data only.

### 4. Table-per-Form Schema Governance
#### 4.1 Field Key Constraints
**Decision (Updated)**
- Maximum field_key length: 100 characters.
- Field keys shall be:
  - Lowercased
  - Non-alphanumeric characters stripped
- Column names are treated as case-insensitive.

**Rationale**
Guarantees safe SQL identifiers and consistent cross-layer behavior.

#### 4.2 Reserved Keywords
**Decision (Unchanged)**
- Field keys must not match reserved SQL keywords.
**Enforced Reserved Keyword Set (PostgreSQL-focused)**
SELECT, INSERT, UPDATE, DELETE, FROM, WHERE, JOIN, INNER, LEFT, RIGHT, FULL, GROUP, ORDER, BY, HAVING, LIMIT, OFFSET, UNION, DISTINCT, TABLE, COLUMN, INDEX, PRIMARY, FOREIGN, KEY, CONSTRAINT, REFERENCES, VIEW, SEQUENCE, TRIGGER, USER, ROLE, GRANT, REVOKE

#### 4.3 Schema Drift Detection
**Decision (Updated)**
Schema drift shall be detected at:
- Form publish time
- Submission time
- Application startup

**Response Policy**
- Publish is blocked if drift is detected.
- Submit is blocked if drift is detected.
- Application startup fails fast if drift is detected.

**Rationale**
Prevents runtime failures and partial data writes.

### 5. Draft Ownership & Concurrency
#### 5.1 Draft Ownership
**Decision (Unchanged)**
- Only one draft per user per form.
- Drafts are not shareable across users.

#### 5.2 Concurrent Draft Submission
**Decision (Unchanged)**
- Earliest-arriving submission is accepted.
- All concurrent submissions are rejected with a clear error.

### 6. Bulk Operations Semantics
#### 6.1 Soft Delete Storage Strategy
**Decision (Updated)**
- Soft delete state for user entries is stored in the form-specific submission table.
- Soft delete state for forms is stored in the form / form-metadata table.

**Rationale**
Keeps operational data local while preserving form-level lifecycle clarity.

#### 6.2 Restore Semantics
**Decision (Updated)**
- Restored records are treated as fully active.
- Timestamps (updated_at, restore time) shall reflect current time, not original values.

**Rationale**
Restoration is a new operational event and must be reflected as such.

#### 6.3 Submission Status Model
**Decision (Unchanged)**
- Only two statuses exist:
  - DRAFT
  - SUBMITTED

### 7. CSV Export Behavior
#### 7.1 Column Selection and Ordering
**Decision (Unchanged)**
- Export only visible columns.
- Order strictly follows form definition.

#### 7.2 CSV Injection Protection
**Decision (Updated)**
- Any value starting with a formula indicator (=, +, -, @) shall be prefixed with a single quote (').

**Rationale**
Prevents Excel formula injection while preserving data readability.

### 8. Authentication & Session Lifecycle
#### 8.1 Session Timeout
**Decision (Unchanged)**
- 15-minute sliding session expiry.

#### 8.2 Session Concurrency Model
**Decision (Clarified)**
- One session per browser.
- Only one active session per user is allowed concurrently.

**Rationale**
Clarifies earlier ambiguity around “per tab” and aligns with cookie-based session behavior.

### 9. Error Message Strategy
#### 9.1 Form-Level Errors
**Decision (Unchanged)**
- Form validation error messages are fully user-defined.

#### 9.2 API Error Responses
**Decision (Unchanged)**
- API responses are technical and structured.
- Frontend is responsible for rendering user-friendly messages.

### 10. Limits & Guardrails
**Decision (Unchanged)**
- Max 50 fields per form
- Max 100 validations per form
- Max 10 pages/sections per form
- Max payload size: 100
- Max file upload size: 5 MB

### 11. Operational Ownership
#### 11.1 Live Form Modification
**Decision (Unchanged)**
- Forms with live submissions cannot be modified.

#### 11.2 Archived Form Reactivation
**Decision (Unchanged)**
- Archived forms may be reactivated.

---

## Development Plan
**Overall Timeline Summary**
- Total duration: 18–20 weeks
- Phases are mostly sequential with controlled overlap.
- Team utilization is kept high by parallelizing frontend and backend work where possible.

| Phase | Name | Duration |
| :--- | :--- | :--- |
| 1 | Requirements & Architecture Baseline | 2 weeks |
| 2 | Core Platform Foundation | 3 weeks |
| 3 | Form Definition & Visual Editor | 5 weeks |
| 4 | Runtime Rendering & Validation | 4 weeks |
| 5 | Persistence & Submission Management | 4 weeks |
| 6 | Stabilization & Release Readiness | 2 weeks |

### Phase 1: Requirements & Architecture Baseline
**Timeline: Week 1 – Week 2**
**Team Allocation:**
- 2 backend + 2 frontend active
- 2 developers lightly involved for early technical spikes

**Objectives:**
- Freeze functional and non-functional requirements.
- Finalize high-level architecture (frontend, backend, DB).
- Define data models for form definitions and submissions.
- Decide validation expression strategy (expression language vs simple scripting).
- Define table-per-form schema evolution approach (manual migrations).

**Definition of Done:**
- Requirements baseline is frozen and internally accepted.
- Architecture decisions are documented and agreed.
- No open scope ambiguities remain.

**Risk Notes:**
- Poor decisions here will cascade into schema rework later.
- This phase must not be rushed.

### Phase 2: Core Platform Foundation
**Timeline: Week 3 – Week 5**
**Team Allocation:**
- Backend: 3 developers
- Frontend: 3 developers

**Backend Focus:**
- Spring Boot 3 application skeleton.
- Session-based authentication via Spring Security.
- Core domain models (Form, Field, Validation, Submission metadata).
- PostgreSQL connectivity and base schema.
- Manual schema initialization strategy (no Flyway/Liquibase).

**Frontend Focus:**
- NextJS SPA shell.
- Simplified authentication flow (non-JWT).
- Base layout, routing, and role-aware navigation.
- API integration scaffolding.

**Definition of Done:**
- User can log in and access secured screens.
- Frontend and backend communicate end-to-end.
- Core entities persist correctly in PostgreSQL.

### Phase 3: Form Definition & Visual Editor
**Timeline: Week 6 – Week 10**
**Team Allocation:**
- Frontend: 4 developers (primary load)
- Backend: 2 developers

**Frontend Focus:**
- Visual form editor (drag-and-drop or controlled UI builder).
- Field palette and canvas.
- Field configuration panels.
- Sectioning and multi-step form support.
- Persisting form definitions.

**Backend Focus:**
- APIs for form definition CRUD.
- Validation definition persistence.
- Versioning of form definitions.

**Definition of Done:**
- Admin can visually create and modify a form.
- Field properties and layout are persisted.
- Multiple versions of a form can exist safely.

**Risk Notes:**
- Visual editor complexity is the single largest frontend risk.
- Over-engineering must be avoided.

### Phase 4: Runtime Rendering & Validation
**Timeline: Week 11 – Week 14**
**Team Allocation:**
- Backend: 3 developers
- Frontend: 3 developers

**Backend Focus:**
- Validation engine implementation (field, conditional, form-level).
- Cross-field validation support.
- Server-side enforcement of all rules.

**Frontend Focus:**
- Dynamic runtime rendering of forms from definitions.
- Client-side validation aligned with backend rules.
- Conditional visibility and enable/disable behavior.

**Definition of Done:**
- Same form definition renders correctly at runtime.
- Invalid submissions are rejected consistently on UI and backend.
- Conditional logic behaves deterministically.

**Risk Notes:**
- Validation rule expressiveness must remain constrained to avoid brittleness.

### Phase 5: Persistence & Submission Management
**Timeline: Week 15 – Week 18**
**Team Allocation:**
- Backend: 3 developers
- Frontend: 3 developers

**Backend Focus:**
- Table-per-form creation logic.
- Controlled schema evolution for form changes.
- Submission persistence (draft and final).
- Bulk operations APIs.

**Frontend Focus:**
- Submission grid views per form.
- Sorting, filtering, pagination.
- Bulk selection and actions.
- CSV export.

**Definition of Done:**
- Each form writes to its own database table.
- Submissions are manageable at scale.
- Bulk operations work reliably.

**Risk Notes:**
- Schema evolution errors here can corrupt data if mishandled.

### Phase 6: Stabilization & Release Readiness
**Timeline: Week 19 – Week 20**
**Team Allocation:**
- All 6 developers

**Objectives:**
- Bug fixing and refinement.
- Performance sanity checks (manual).
- UX smoothing for editor and grids.
- Access control verification.

**Definition of Done:**
- All in-scope features are functional.
- No known critical or high-severity defects.
- System is deployable for internal usage.

---

## Data Model
### Conceptual Data Model
At a conceptual level, the system consists of two clearly separated concerns:
1. **Form Definition Domain**
   - Form
   - Form Version
   - Form Field
   - Field Validation
   - Conditional Logic
2. **Form Execution Domain**
   - Form Submission
   - Submission Metadata
   - Per-form Submission Tables

**Key design principle:**
Form definitions are stable, normalized, and versioned.
Form data is denormalized and optimized for operational access.

### Logical Data Model
#### Core Entities
- **Form**: Represents a logical form (e.g., “Employee Onboarding”).
- **FormVersion**: Immutable snapshot of a form definition at a point in time. Submissions always reference a specific version.
- **FormField**: Field metadata belonging to a form version.
- **FieldValidation**: Validation rules associated with fields or the form as a whole.
- **FormSubmissionMeta**: Metadata about a submission (who, when, status). Actual data lives in per-form tables.

### Physical Database Schema (PostgreSQL 17)
#### 1. form
Stores the logical form container.
- `id` UUID (PK)
- `code` VARCHAR(100) UNIQUE NOT NULL
- `name` VARCHAR(255) NOT NULL
- `description` TEXT
- `status` VARCHAR(20) NOT NULL -- DRAFT, PUBLISHED, ARCHIVED
- `created_by` VARCHAR(100) NOT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

**Notes:**
- `code` is used for stable identification and table naming.
- No soft deletes; lifecycle is explicit via status.

#### 2. form_version
Stores immutable form definitions.
- `id` UUID (PK)
- `form_id` UUID NOT NULL
- `version_number` INTEGER NOT NULL
- `is_active` BOOLEAN NOT NULL
- `definition_json` JSONB NOT NULL
- `created_by` VARCHAR(100) NOT NULL
- `created_at` TIMESTAMP NOT NULL

**Constraints:**
- Unique (form_id, version_number)
- Only one active version per form

**Notes:**
- `definition_json` contains layout, ordering, sections, and UI hints.
- Field-level data is still normalized separately for validation and querying.

#### 3. form_field
Represents individual fields within a form version.
- `id` UUID (PK)
- `form_version_id` UUID NOT NULL
- `field_key` VARCHAR(100) NOT NULL
- `label` VARCHAR(255) NOT NULL
- `field_type` VARCHAR(50) NOT NULL
- `is_required` BOOLEAN NOT NULL
- `is_read_only` BOOLEAN NOT NULL
- `default_value` TEXT
- `display_order` INTEGER NOT NULL
- `config_json` JSONB

**Constraints:**
- Unique (form_version_id, field_key)

**Notes:**
- `config_json` stores UI-specific settings (placeholder, options, etc.).
- `field_key` maps directly to a column in the submission table.

#### 4. field_validation
Stores validation and conditional validation rules.
- `id` UUID (PK)
- `form_version_id` UUID NOT NULL
- `field_key` VARCHAR(100)
- `validation_type` VARCHAR(50) NOT NULL
- `expression` TEXT NOT NULL
- `error_message` VARCHAR(255) NOT NULL
- `execution_order` INTEGER NOT NULL
- `scope` VARCHAR(20) NOT NULL -- FIELD, FORM

**Notes:**
- `expression` is evaluated by a validation engine.
- `field_key` is nullable for form-level validations.
- Conditional validations are encoded in the expression itself.

#### 5. form_submission_meta
Stores submission metadata only.
- `id` UUID (PK)
- `form_id` UUID NOT NULL
- `form_version_id` UUID NOT NULL
- `submission_table` VARCHAR(255) NOT NULL
- `submission_row_id` UUID NOT NULL
- `status` VARCHAR(20) NOT NULL -- DRAFT, SUBMITTED
- `submitted_by` VARCHAR(100)
- `submitted_at` TIMESTAMP
- `created_at` TIMESTAMP NOT NULL

**Notes:**
- This table provides a stable cross-form view of submissions.
- Actual data is intentionally not stored here.

### Table-Per-Form Submission Tables
#### Naming Convention
`form_data_<form_code>`
Example: `form_data_employee_onboarding`

#### Example Submission Table Structure
Assume form fields:
- `employee_name` (TEXT)
- `date_of_joining` (DATE)
- `salary` (NUMERIC)

**form_data_employee_onboarding**
- `id` UUID (PK)
- `form_version_id` UUID NOT NULL
- `employee_name` TEXT
- `date_of_joining` DATE
- `salary` NUMERIC
- `is_draft` BOOLEAN NOT NULL
- `created_at` TIMESTAMP NOT NULL
- `updated_at` TIMESTAMP NOT NULL

**Notes:**
- Columns are created dynamically when a form is published.
- Nullable columns allow backward compatibility.
- No foreign keys to form_field to avoid schema breakage.

### Schema Evolution Strategy (Without Flyway/Liquibase)
#### Allowed Operations
- Add new columns when fields are added.
- Keep old columns when fields are removed (logical deprecation).
- Never drop columns automatically.

#### Version Handling
- Each submission row stores `form_version_id`.
- Rendering logic uses the matching form version.
- Old submissions remain readable even after form evolution.

### Indexes
Recommended baseline indexes:
- `form(code)`
- `form_version(form_id, is_active)`
- `form_submission_meta(form_id, status)`
- **Submission tables:**
  - `created_at`
  - `submitted_by` (if frequently queried)

### Data Integrity Guarantees
- Strong integrity for form definitions.
- Eventual consistency between submission meta and submission tables [inferred but acceptable].
- Validation correctness enforced at application level, not DB constraints.

### Column Key
Below are column-level comments / hints to be added to the already-defined schema.
This is an additive annotation layer only.

#### form table – column hints
- `id`: Primary identifier for the logical form; stable across all versions.
- `code`: Human-readable and system-stable identifier; used for submission table naming and API references. Must never change once published.
- `name`: Display name of the form shown in UI listings and selectors.
- `description`: Optional explanatory text describing the business purpose of the form.
- `status`: Lifecycle state controlling visibility and editability (DRAFT, PUBLISHED, ARCHIVED).
- `created_by`: Identifier of the user who created the form.
- `created_at`: Timestamp when the form was first created.
- `updated_at`: Timestamp of the last metadata change to the form (not submissions).

#### form_version table – column hints
- `id`: Unique identifier for a specific immutable version of a form.
- `form_id`: Reference to the parent logical form.
- `version_number`: Sequential version number, monotonically increasing per form.
- `is_active`: Indicates which version is currently used for new submissions.
- `definition_json`: Serialized snapshot of the full form structure (layout, sections, ordering, UI hints).
- `created_by`: Identifier of the user who published this version.
- `created_at`: Timestamp when this version was created and locked.

#### form_field table – column hints
- `id`: Unique identifier of the field definition.
- `form_version_id`: Identifies the exact form version this field belongs to.
- `field_key`: Stable programmatic identifier; directly maps to a column name in the submission table.
- `label`: Human-readable label displayed on the form UI.
- `field_type`: Field control type (TEXT, NUMBER, DATE, DROPDOWN, etc.).
- `is_required`: Indicates whether the field must be populated for a valid submission.
- `is_read_only`: Indicates whether the field is displayed but not editable at runtime.
- `default_value`: Default value applied when the form is initially rendered.
- `display_order`: Determines ordering of fields within the form or section.
- `config_json`: Field-specific configuration such as placeholder text, dropdown options, or UI hints.

#### field_validation table – column hints
- `id`: Unique identifier for a validation rule.
- `form_version_id`: Indicates the form version where this validation applies.
- `field_key`: Target field for the validation; NULL for form-level validations.
- `validation_type`: Logical classification of the rule (REQUIRED, REGEX, CONDITIONAL, CUSTOM).
- `expression`: Boolean expression evaluated against submission data to determine validity.
- `error_message`: Message shown to the user when validation fails.
- `execution_order`: Determines evaluation sequence when multiple validations exist.
- `scope`: Defines whether validation applies at FIELD level or FORM level.

#### form_submission_meta table – column hints
- `id`: Unique identifier for the submission metadata record.
- `form_id`: Logical form to which this submission belongs.
- `form_version_id`: Exact form version used to render and validate this submission.
- `submission_table`: Name of the physical table where submission data is stored.
- `submission_row_id`: Primary key of the corresponding row in the submission table.
- `status`: Submission state (DRAFT or SUBMITTED).
- `submitted_by`: Identifier of the user who submitted the form.
- `submitted_at`: Timestamp when the form was finally submitted.
- `created_at`: Timestamp when the submission record was first created (including drafts).

#### Per-form submission tables – column hints
- `id`: Primary key for the submission row.
- `form_version_id`: Indicates which version of the form produced this row.
- `<field_key columns>`: One column per form field; column name matches field_key.
- `is_draft`: Indicates whether the submission is still in-progress.
- `created_at`: Timestamp when the submission row was created.
- `updated_at`: Timestamp of the last modification to the submission row.

---


## API Contracts
### API Design Principles
- Base path: `/api/v1`
- All timestamps are ISO-8601 strings.
- UUIDs are used as identifiers.
- Backend is the source of truth for validation and authorization.
- Frontend-side validation is advisory only.

### Authentication & Session APIs
#### Login
`POST /api/v1/auth/login`
**Request**
```json
{
  "username": "string",
  "password": "string"
}
```
**Response (200)**
```json
{
  "userId": "uuid",
  "username": "string",
  "roles": ["FORM_ADMIN", "FORM_USER"]
}
```
**Notes**
- Creates an HTTP session.
- Cookie-based session propagation.

#### Logout
`POST /api/v1/auth/logout`
**Response (200)**
```json
{
  "message": "Logged out"
}
```

#### Current Session
`GET /api/v1/auth/me`
**Response (200)**
```json
{
  "userId": "uuid",
  "username": "string",
  "roles": ["FORM_ADMIN", "FORM_USER"]
}
```

### Form Definition APIs
#### Create Form
`POST /api/v1/forms`
**Request**
```json
{
  "code": "employee_onboarding",
  "name": "Employee Onboarding",
  "description": "Employee onboarding form"
}
```
**Response (201)**
```json
{
  "formId": "uuid",
  "status": "DRAFT"
}
```

#### List Forms
`GET /api/v1/forms`
**Response (200)**
```json
[
  {
    "formId": "uuid",
    "code": "employee_onboarding",
    "name": "Employee Onboarding",
    "status": "PUBLISHED",
    "activeVersion": 3
  }
]
```

#### Get Form (Metadata Only)
`GET /api/v1/forms/{formId}`
**Response (200)**
```json
{
  "formId": "uuid",
  "code": "employee_onboarding",
  "name": "Employee Onboarding",
  "description": "Employee onboarding form",
  "status": "PUBLISHED"
}
```

### Form Version APIs
#### Create New Form Version
`POST /api/v1/forms/{formId}/versions`
**Request**
```json
{
  "baseVersion": 2,
  "definitionJson": { }
}
```
**Response (201)**
```json
{
  "formVersionId": "uuid",
  "versionNumber": 3,
  "isActive": false
}
```

#### Activate Form Version
`POST /api/v1/forms/{formId}/versions/{versionId}/activate`
**Response (200)**
```json
{
  "message": "Version activated"
}
```

#### Get Form Version Definition
`GET /api/v1/forms/{formId}/versions/{versionId}`
**Response (200)**
```json
{
  "formVersionId": "uuid",
  "versionNumber": 3,
  "definitionJson": { }
}
```

### Field Definition APIs
#### Add / Update Field
`PUT /api/v1/forms/{formId}/versions/{versionId}/fields/{fieldKey}`
**Request**
```json
{
  "label": "Employee Name",
  "fieldType": "TEXT",
  "isRequired": true,
  "isReadOnly": false,
  "defaultValue": null,
  "displayOrder": 1,
  "config": { }
}
```
**Response (200)**
```json
{
  "fieldId": "uuid"
}
```

#### List Fields
`GET /api/v1/forms/{formId}/versions/{versionId}/fields`
**Response (200)**
```json
[
  {
    "fieldKey": "employee_name",
    "label": "Employee Name",
    "fieldType": "TEXT",
    "isRequired": true
  }
]
```

### Validation APIs
#### Add / Update Validation
`PUT /api/v1/forms/{formId}/versions/{versionId}/validations/{validationId}`
**Request**
```json
{
  "fieldKey": "salary",
  "scope": "FIELD",
  "validationType": "CUSTOM",
  "expression": "salary > 0",
  "errorMessage": "Salary must be greater than zero",
  "executionOrder": 1
}
```
**Response (200)**
```json
{
  "validationId": "uuid"
}
```

### Runtime Form Rendering APIs
#### Get Active Form for Rendering
`GET /api/v1/runtime/forms/{formCode}`
**Response (200)**
```json
{
  "formId": "uuid",
  "formVersionId": "uuid",
  "definitionJson": { },
  "fields": [ ],
  "validations": [ ]
}
```

### Submission APIs
#### Save Draft Submission
`POST /api/v1/runtime/forms/{formCode}/submissions/draft`
**Request**
```json
{
  "data": {
    "employee_name": "Anshuman",
    "salary": 50000
  }
}
```
**Response (200)**
```json
{
  "submissionId": "uuid",
  "status": "DRAFT"
}
```

#### Submit Form
`POST /api/v1/runtime/forms/{formCode}/submissions/submit`
**Request**
```json
{
  "submissionId": "uuid",
  "data": {
    "employee_name": "Anshuman",
    "salary": 50000
  }
}
```
**Response (200)**
```json
{
  "submissionId": "uuid",
  "status": "SUBMITTED"
}
```

### Submission Management APIs
#### List Submissions (Grid View)
`GET /api/v1/forms/{formId}/submissions`
**Query Params**
- page
- size
- sort
- filter

**Response (200)**
```json
{
  "total": 120,
  "items": [
    {
      "submissionId": "uuid",
      "status": "SUBMITTED",
      "submittedBy": "user1",
      "submittedAt": "2026-01-20T10:30:00Z"
    }
  ]
}
```

#### Bulk Operations
`POST /api/v1/forms/{formId}/submissions/bulk`
**Request**
```json
{
  "operation": "DELETE",
  "submissionIds": ["uuid1", "uuid2"]
}
```
**Response (200)**
```json
{
  "processed": 2
}
```

#### CSV Export
`GET /api/v1/forms/{formId}/submissions/export`
**Response**
- Content-Type: `text/csv`

### Error Handling Convention
All error responses follow a consistent structure.
**Response (4xx / 5xx)**
```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "Form validation failed",
  "details": [
    {
      "fieldKey": "salary",
      "message": "Salary must be greater than zero"
    }
  ]
}
```
---

## Front End Views
### 1. Login View
- **Purpose**: Establish a server-side authenticated session.
- **Data Required**: username, password
- **API Dependencies**: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- **UI States**: Initial, Submitting, Error, Authenticated (redirect)
- **Validation Rules**: Username (non-empty), Password (non-empty)
- **Interaction Flow**:
  1. User enters credentials.
  2. Clicks Login.
  3. Disable button, show loading.
  4. On success: session cookie set, redirect to Dashboard.
  5. On failure: show inline error.
- **Edge Cases**: Session already active → redirect to Dashboard. Backend unavailable → generic error message.
- **Developer Hints**: Do not store tokens in localStorage. Rely on cookies sent automatically. Use NextJS middleware or layout guard to redirect authenticated users.

### 2. Dashboard View
- **Purpose**: Provide system overview and navigation shortcuts.
- **Data Required**: Total forms count, Draft vs published forms count, Total submissions count, Recently modified forms.
- **API Dependencies**: `GET /api/v1/forms`, `GET /api/v1/forms/{formId}/submissions?size=5`
- **UI States**: Loading, Loaded, Partial failure.
- **Interaction Flow**: Load all widgets in parallel. Each widget failure should not block the entire page.
- **Edge Cases**: No forms exist → show empty state CTA (“Create your first form”).
- **Developer Hints**: Do not over-optimize queries. Prefer simple aggregations on backend.

### 3. Forms List View
- **Purpose**: Browse and manage all forms.
- **Data Required**: formId, code, name, status, activeVersion, updatedAt.
- **API Dependencies**: `GET /api/v1/forms`
- **UI States**: Loading, Loaded, Empty, Error.
- **Interactions**: Row click → Form Detail, Create Form button, Archive form (confirmation required).
- **Validation Rules**: Archive disabled for already archived forms.
- **Edge Cases**: Large number of forms → pagination required.
- **Developer Hints**: Keep grid purely read-only. Avoid inline edits to reduce accidental changes.

### 4. Form Metadata View (Create / Edit)
- **Purpose**: Capture high-level form information.
- **Data Required**: name, code, description.
- **API Dependencies**: `POST /api/v1/forms`, `GET /api/v1/forms/{formId}`
- **UI States**: New form, Edit existing, Saving, Error.
- **Validation Rules**: Code: required, lowercase, underscores only. Code immutable once saved.
- **Interaction Flow**: Create → redirect to Version Management.
- **Edge Cases**: Duplicate code → backend error surfaced inline.
- **Developer Hints**: Disable code input on edit mode. Explain immutability visually (helper text).

### 5. Form Version Management View
- **Purpose**: Control form evolution.
- **Data Required**: versionNumber, createdBy, createdAt, isActive.
- **API Dependencies**: `GET /api/v1/forms/{formId}/versions`, `POST /api/v1/forms/{formId}/versions`, `POST /api/v1/forms/{formId}/versions/{versionId}/activate`
- **UI States**: Loading, Loaded, Activating.
- **Interactions**: Create new version (clones last version), Activate version (confirmation).
- **Rules**: Active version cannot be edited. Only one active version allowed.
- **Edge Cases**: No versions yet → auto-create version 1.
- **Developer Hints**: Treat versions as immutable snapshots. Read-only rendering for active versions.

### 6. Visual Form Editor View
- **Purpose**: Define form structure visually.
- **Data Required**: fields, sections, layout metadata.
- **API Dependencies**: `GET /api/v1/forms/{formId}/versions/{versionId}`, `PUT /api/v1/forms/{formId}/versions/{versionId}/fields/{fieldKey}`
- **UI Regions**: Field Palette, Canvas, Configuration Panel.
- **Interactions**: Add field, Reorder fields, Edit configuration, Remove field (logical delete).
- **Validation Rules**: Field key uniqueness, Field type immutable after creation.
- **Edge Cases**: Unsaved changes warning, Removing a field used in validations.
- **Developer Hints**: Keep canvas state client-side until save. Use stable field keys, not labels.

### 7. Validation Configuration View
- **Purpose**: Define validation rules.
- **Data Required**: validationType, scope, expression, errorMessage, executionOrder.
- **API Dependencies**: `GET /api/v1/forms/{formId}/versions/{versionId}`, `PUT /api/v1/forms/{formId}/versions/{versionId}/validations/{validationId}`
- **UI States**: Loading, Editing, Validation error.
- **Rules**: Expressions must be syntactically valid. Form-level validations must not reference nonexistent fields.
- **Edge Cases**: Field removed but validation exists.
- **Developer Hints**: Provide expression examples inline. Do not auto-correct expressions.

### 8. Runtime Form Rendering View
- **Purpose**: Allow users to fill forms.
- **Data Required**: form definition, field metadata, validations.
- **API Dependencies**: `GET /api/v1/runtime/forms/{formCode}`, `POST /api/v1/runtime/forms/{formCode}/submissions/draft`, `POST /api/v1/runtime/forms/{formCode}/submissions/submit`
- **UI States**: Loading, Editing, Validation error, Submitted.
- **Rules**: Mandatory fields required. Disable submit on validation failure.
- **Edge Cases**: Active version changes mid-session.
- **Developer Hints**: Use same rendering logic as read-only view. Keep validation messages near fields.

### 9. Submissions List (Grid View)
- **Purpose**: Operational management.
- **Data Required**: submissionId, status, submittedBy, submittedAt.
- **API Dependencies**: `GET /api/v1/forms/{formId}/submissions`
- **UI States**: Loading, Loaded, Empty.
- **Interactions**: Row select, Bulk select, Bulk action toolbar.
- **Rules**: Bulk actions disabled with no selection.
- **Edge Cases**: Very large datasets → server pagination mandatory.
- **Developer Hints**: Never load all rows at once. Keep filters server-driven.

### 10. Submission Detail (Read-Only) View
- **Purpose**: Review submitted data.
- **Data Required**: submission data, metadata.
- **API Dependencies**: `GET /api/v1/forms/{formId}/submissions/{submissionId}`
- **UI Rules**: No editable inputs. Layout mirrors runtime form.
- **Edge Cases**: Submission version differs from current active version.
- **Developer Hints**: Always render using submission’s `form_version_id`.

### 11. Bulk Action Confirmation View
- **Purpose**: Prevent accidental destructive actions.
- **Data Required**: operation, affected count.
- **API Dependencies**: `POST /api/v1/forms/{formId}/submissions/bulk`
- **UI Rules**: Explicit confirmation. No default focus on confirm.
- **Developer Hints**: Make dialog blocking. Show irreversible warning text.

**Global Developer Guidelines**
- Always assume backend is authoritative.
- Never infer schema from frontend state.
- Handle partial API failures gracefully.
- Avoid hidden state transitions.
- Prefer explicit UI affordances over automation.

---

## Task List
### PHASE 2 — CORE PLATFORM FOUNDATION
#### Task 2.1 — Backend Application Skeleton Initialization
**Task Definition**
Create a Spring Boot 3 application using Java 21 that starts successfully, connects to PostgreSQL 17, and exposes a secured REST API base.

**User Stories**
- As a developer, I want a clean backend skeleton so that all future features have a consistent foundation.
- As an architect, I want predictable startup and configuration behavior without profiles or hidden magic.

**Acceptance Criteria**
- Application starts successfully on Java 21.
- Connects to PostgreSQL 17 using JDBC.
- Base `/api/v1` endpoint responds (secured or unsecured as designed).
- No Flyway/Liquibase configured.
- Maven build succeeds with a single configuration.

**Subtasks**
1. Create Spring Boot project structure.
2. Configure Maven (no profiles).
3. Configure PostgreSQL datasource.
4. Configure basic logging.
5. Define base package structure.

**Detailed Approach**
- Use Spring Boot 3.x parent with Java 21 target.
- Define clear package separation: config, security, controller, service, repository, domain.
- Hardcode DB schema initialization responsibility to application logic later (no migration tools).
- Ensure application fails fast on DB connection failure.

**Test Scenarios / Common Mistakes**
- Application starts without DB connection → must fail.
- Using deprecated Spring Security config styles.
- Accidentally enabling profiles.
- Using Java 21 features that implicitly rely on virtual threads (not allowed).

#### Task 2.2 — Database Base Schema Initialization
**Task Definition**
Create core platform tables required for authentication and future ownership tracking.

**Acceptance Criteria**
- Database schema is created deterministically at startup.
- No automatic migrations.
- Schema creation is idempotent.

**Subtasks**
1. Define core tables (users, roles).
2. Write SQL DDL scripts.
3. Execute DDL on startup (application-controlled).
4. Validate schema presence.

**Detailed Approach**
- Use a startup initializer component.
- Execute `CREATE TABLE IF NOT EXISTS`.
- Keep schema minimal: app_user, app_role, user_role_mapping.

**Test Scenarios**
- App restart should not fail due to existing tables.
- Partial schema creation should fail fast.
- Incorrect DB permissions.

#### Task 2.3 — Backend Security Model Definition
**Task Definition**
Define a minimal but extensible authentication and authorization model.

**Acceptance Criteria**
- Roles are defined (e.g., FORM_ADMIN, FORM_USER).
- Users can have multiple roles.
- Authorization is declarative and consistent.

**Subtasks**
1. Define role enum.
2. Define user entity.
3. Define role mapping.
4. Prepare repository interfaces.

**Detailed Approach**
- Use Spring Security authorities.
- Keep role names stable and explicit.

**Test Scenarios**
- User with no roles gaining access.
- Role name mismatch between DB and code.

#### Task 2.4 — Session-Based Authentication (Spring Security)
**Task Definition**
Implement session-based authentication using Spring Security.

**Acceptance Criteria**
- Login creates HTTP session.
- Logout invalidates session.
- Secured endpoints reject unauthenticated access.
- JWT is not used anywhere.

**Subtasks**
1. Configure SecurityFilterChain.
2. Implement login endpoint.
3. Implement logout endpoint.
4. Configure session management.
5. Secure `/api/v1/**`.

**Detailed Approach**
- Use form-login-like flow but custom controller.
- Store user identity in SecurityContext.
- Configure CSRF appropriately for SPA.

**Test Scenarios**
- Session fixation.
- Logout not clearing session.
- Accessing secured APIs after logout.

#### Task 2.5 — Backend Error Handling & Response Contract
**Task Definition**
Standardize API error responses across the platform.

**Acceptance Criteria**
- All errors follow a single JSON structure.
- Validation, auth, and system errors are distinguishable.
- Stack traces never leak.

**Subtasks**
1. Define error response model.
2. Implement global exception handler.
3. Map security exceptions/validation exceptions.

**Detailed Approach**
- Use `@ControllerAdvice`.
- Define errorCode taxonomy early.

#### Task 2.6 — Frontend SPA Skeleton (NextJS)
**Task Definition**
Create a NextJS application shell capable of authenticated navigation.

**Acceptance Criteria**
- App loads without authentication errors.
- Global layout exists.
- Routing works for public and protected pages.

**Subtasks**
1. Initialize NextJS project.
2. Create base layout.
3. Configure routing.
4. Setup API client abstraction.

**Detailed Approach**
- Use App Router consistently.
- Centralize API calls.

#### Task 2.7 — Simplified Frontend Authentication Flow
**Task Definition**
Implement a minimal, non-JWT frontend authentication mechanism.

**Acceptance Criteria**
- Login redirects correctly.
- Session persists across refresh.
- Logout clears UI state.

**Subtasks**
1. Login page UI.
2. Auth API integration.
3. Auth state tracking.
4. Route guarding.

**Detailed Approach**
- Rely on backend session cookie.
- Use `/auth/me` to detect login state.

#### Task 2.8 — Frontend Route Guarding & Role Awareness
**Task Definition**
Prevent unauthorized users from accessing protected routes.

**Acceptance Criteria**
- Routes are protected by role.
- Unauthorized access redirects cleanly.
- UI hides inaccessible navigation.

**Subtasks**
1. Role model in frontend.
2. Route guard logic.
3. Navigation filtering.

#### Task 2.9 — Backend–Frontend Integration Validation
**Task Definition**
Ensure full end-to-end flow works reliably.

**Acceptance Criteria**
- Login → navigate → secured API → logout works.
- No CORS/session issues.

**Subtasks**
1. Validate login/logout flow.
2. Validate secured API access.
3. Validate session expiry handling.

### PHASE 3 — FORM DEFINITION & VISUAL EDITOR
#### Task 3.1 — Form Definition Domain Model Finalization
**Acceptance Criteria**
- Form, FormVersion, Field, Validation entities exist.
- Immutability enforced. Only one active version.

**Subtasks**
1. Define JPA entities for form definition domain.
2. Define repositories.
3. Enforce version immutability.
4. Define status transitions.

#### Task 3.2 — Form Metadata Management APIs
**Acceptance Criteria**
- Form code uniqueness enforced.
- Archived forms cannot be edited.

**Subtasks**
1. Create form creation API.
2. Implement list and get APIs.
3. Implement archive logic.

#### Task 3.3 — Form Version Lifecycle APIs
**Acceptance Criteria**
- New version clones previous definition.
- Only one active version exists.
- Active version is read-only.

**Subtasks**
1. Create version API.
2. Clone definition logic.
3. Activate version API.

#### Task 3.4 — Visual Editor Data Contract Definition
**Acceptance Criteria**
- JSON schema defined and enforced.
- Backward compatible structure.
- Explicit section and ordering model.

**Subtasks**
1. Define layout schema.
2. Define section model.
3. Define field references.
4. Define ordering rules.

#### Task 3.5 — Frontend Visual Editor Shell
**Acceptance Criteria**
- Editor loads without data.
- Panels (palette, canvas, config) are visible.

**Subtasks**
1. Canvas layout.
2. Field palette UI.
3. Configuration panel placeholder.
4. State container setup.

#### Task 3.6 — Field Palette & Field Creation
**Acceptance Criteria**
- Field types supported.
- Field keys are unique and immutable post creation.

**Subtasks**
1. Field palette UI.
2. Field creation dialog.
3. Key validation.
4. Add field to canvas.

#### Task 3.7 — Field Configuration Panel
**Acceptance Criteria**
- Changes reflect instantly on canvas.
- Invalid configs rejected.

**Subtasks**
1. Configuration UI per field.
2. Validation of inputs.
3. State sync with canvas.
4. Save logic.

#### Task 3.8 — Sectioning, Ordering & Page Breaks
**Acceptance Criteria**
- Sections can be added/removed.
- Fields reorderable.
- Page breaks supported.

**Subtasks**
1. Section creation.
2. Drag-and-drop ordering.
3. Page break markers.
4. Persist ordering.

#### Task 3.9 — Validation Definition UI
**Acceptance Criteria**
- Field-level and form-level validations supported.
- Execution order configurable.
- Expressions stored verbatim.

**Subtasks**
1. Validation list UI.
2. Validation editor UI.
3. Expression input.
4. Save logic.

#### Task 3.10 — Unsaved Changes & Editor State Management
**Acceptance Criteria**
- Navigation warning shown.
- Dirty state tracked.
- Explicit save required.

**Subtasks**
1. Dirty state detection.
2. Navigation intercept.
3. Save confirmation.

#### Task 3.11 — Backend Persistence of Form Definitions
**Acceptance Criteria**
- Save is transactional.
- Definition JSON + fields + validations consistent.
- Version integrity preserved.

**Subtasks**
1. Save endpoint.
2. Transaction boundary.
3. Validation before persist.

### PHASE 4 — RUNTIME FORM RENDERING & VALIDATION
#### Task 4.1 — Runtime Form Resolution (Backend)
**Acceptance Criteria**
- Resolved by formCode.
- Only active version returned.

**Subtasks**
1. Resolve form by code.
2. Resolve active version.
3. Assemble runtime DTO.
4. Reject inactive/archived forms.

#### Task 4.2 — Runtime Form Rendering Engine (Frontend)
**Acceptance Criteria**
- All supported field types render correctly.
- Sections and ordering respected.
- Required fields visually indicated.

**Subtasks**
1. Build generic field renderer.
2. Render sections/pages.
3. Render labels, help text.
4. Render read-only fields.

#### Task 4.3 — Client-Side Validation Engine (Advisory)
**Acceptance Criteria**
- Required validations enforced.
- Conditional validations respected.
- Errors shown inline. (Advisory only)

**Subtasks**
1. Required field validation.
2. Expression evaluation (basic).
3. Conditional validation support.
4. Error message rendering.

#### Task 4.4 — Draft Save Flow (Backend)
**Acceptance Criteria**
- Accepts incomplete data.
- Draft ID returned.

**Subtasks**
1. Draft submission endpoint.
2. Minimal validation logic.
3. Temporary data storage.
4. Draft retrieval support.

#### Task 4.5 — Final Submission Validation (Backend)
**Acceptance Criteria**
- All required validations enforced.
- Conditional and form-level validations enforced.
- Error aggregation.

**Subtasks**
1. Field-level/Conditional/Form-level execution.
2. Error aggregation.

#### Task 4.6 — Validation Expression Evaluation Engine (Backend)
**Acceptance Criteria**
- Whitelisted operations only.
- No reflection/method calls.
- Deterministic.

**Subtasks**
1. Define expression grammar.
2. Implement parser/evaluator.
3. Bind field values.
4. Handle nulls safely.

#### Task 4.7 — Error Mapping & Response Normalization
**Acceptance Criteria**
- Field errors mapped to field keys.
- Status 400.

**Subtasks**
1. Define validation error DTO.
2. Map internal errors.
3. Integrate with global error handler.

#### Task 4.8 — Frontend Submission Flow Control
**Acceptance Criteria**
- Submit disabled during processing.
- Draft and submit clearly distinct.

**Subtasks**
1. Draft/Submit button logic.
2. Loading and disable states.
3. Error display mapping.

#### Task 4.9 — Runtime Version Consistency Handling
**Acceptance Criteria**
- Version mismatch detected.
- User prompted to reload.

**Subtasks**
1. Include version ID in payload.
2. Validate version on submit.
3. Define mismatch behavior.

#### Task 4.10 — End-to-End Runtime Flow Validation
**Acceptance Criteria**
- Render → validate → submit flow works.
- Errors propagate correctly.

**Subtasks**
1. Happy-path submission.
2. Invalid submission tests.
3. Draft save/resume tests.

### PHASE 5 — PERSISTENCE & SUBMISSION MANAGEMENT
#### Task 5.1 — Table-Per-Form Physical Schema Generation
**Acceptance Criteria**
- One table per form.
- Columns match fields.
- System columns (id, version, timestamps) included.

**Subtasks**
1. Define table naming.
2. Map field types to SQL.
3. Generate/Execute CREATE TABLE.

#### Task 5.2 — Schema Evolution Strategy (No Migration Tools)
**Acceptance Criteria**
- New fields add new columns.
- Removed fields do not drop columns.
- Destructive changes blocked.

**Subtasks**
1. Detect schema drift.
2. Generate ALTER TABLE statements.
3. Apply non-destructive/Block destructive.

#### Task 5.3 — Durable Draft Persistence
**Acceptance Criteria**
- Drafts stored in same table (`is_draft = true`).
- Overwrite on update.
- Associated with user.

**Subtasks**
1. Insert/Update draft row.
2. Association logic.
3. Timestamp tracking.

#### Task 5.4 — Final Submission Persistence
**Acceptance Criteria**
- immutable after final submit (`is_draft = false`).
- Metadata recorded.

**Subtasks**
1. Insert final submission record.
2. Mark draft as final.
3. Generate submission ID.

#### Task 5.5 — Submission Metadata Management
**Acceptance Criteria**
- Metadata record (who, when, table, row_id) created.
- Consistency between meta and dynamic tables.

**Subtasks**
1. Insert/Update metadata.
2. Enforce referential consistency.

#### Task 5.6 — Submission Listing Query Engine
**Acceptance Criteria**
- Pagination/Sorting/Filtering (status, date) supported.

**Subtasks**
1. Query metadata table.
2. Join minimal submission data.
3. Apply filters.

#### Task 5.7 — Submission Detail Retrieval
**Acceptance Criteria**
- Rendered using correct version (not necessarily active).
- Data loaded from dynamic table.

**Subtasks**
1. Resolve metadata.
2. Query form table.
3. Load versioned definition.

#### Task 5.8 — Bulk Operation Backend Support
**Acceptance Criteria**
- Bulk delete/status update.
- Transactional per batch.

**Subtasks**
1. Bulk API.
2. Validate IDs.
3. Execute operations.

#### Task 5.9 — CSV Export
**Acceptance Criteria**
- Header row included.
- Streamed for large datasets.

**Subtasks**
1. Resolve columns.
2. Stream rows.
3. Set headers.

#### Task 5.10 — Frontend Submission Grid View
**Acceptance Criteria**
- Paginated grid.
- Bulk selection and actions.
- Confirmation for delete.

**Subtasks**
1. Grid UI.
2. Pagination/Filter controls.
3. Bulk action toolbar.

### PHASE 6 — STABILIZATION & RELEASE READINESS
#### Tasks 6.1 - 6.8
1. **End-to-End Flow Validation**
2. **Data Integrity & Consistency**
3. **Security & Access Control Verification**
4. **Validation Correctness & Drift Detection**
5. **UX Consistency Review**
6. **Performance Sanity Checks**
7. **Error Handling & Failure Mode Validation**
8. **Operational Readiness & Release Checklist**

---

## Implementation Notes
### Phase 2 — Core Platform Foundation
- **Task 2.1**: Clean package structure (config, controller, service, repository, domain). Java 21 features (no virtual threads). `application.properties` only. Fail-fast on DB.
- **Task 2.2**: Explicit SQL (not Hibernate auto), `CREATE TABLE IF NOT EXISTS`. Minimal base schema.
- **Task 2.3**: Enum roles, explicit modeling. Centralized auth rules.
- **Task 2.4**: Session-based auth (not JWT). STATEFUL server sessions. CSRF handle.
- **Task 2.5**: One error structure, `@ControllerAdvice`. Hide stack traces.
- **Task 2.6**: Base layout, central API client. Explicit loading/error states.
- **Task 2.7**: `/auth/me` for state tracking. Explicit logout/session expiry handling.
- **Task 2.8**: Backend auth is source of truth. UI role checks are for UX only.
- **Task 2.9**: Manual flow verification. Log inspection.

### Phase 3 — Form Definition & Visual Editor
- **Task 3.1**: Form/Version/Field/Validation separate. Immutability for active. JSON for layout.
- **Task 3.2**: Meta separate from version. Unique codes.
- **Task 3.3**: Clone previous version for new ones (no shared mutables). Transactional activation.
- **Task 3.4**: JSON layout schema, stable field IDs, explicit order index.
- **Task 3.5**: Editor areas split. Local state (not auto-save).
- **Task 3.6**: Fixed field types, normalized keys, provide defaults.
- **Task 3.7**: Select field focus, client-side validation, reset on selection change.
- **Task 3.8**: Domain structure for sections, drag-and-drop order, delete warnings.
- **Task 3.9**: Definition separation, explicit evaluation order.
- **Task 3.10**: Dirty flag, navigation intercept, clear after success.
- **Task 3.11**: Atomic persistence (transactional), validate whole before persist.

### Phase 4 — Runtime Form Rendering & Validation
- **Task 4.1**: Active version resolution only. assembled DTO.
- **Task 4.2**: Render purely from definition (no hardcoding), components per-type, indicators.
- **Task 4.3**: Client validation is advisory. Required check first.
- **Task 4.4**: Draft allows incomplete. Association with version/user. returns draft ID.
- **Task 4.5**: Authoritative backend, collective error reporting (use field keys).
- **Task 4.6**: Safe whitelisted evaluator. No dynamic code. Explicit null handling.
- **Task 4.7**: Consistent validation error DTO, Field vs Form split, HTTP 400.
- **Task 4.8**: Disable buttons, distinct actions, clear stale errors.
- **Task 4.9**: versionId in payloads, reject outdated, reload prompt.
- **Task 4.10**: Manual verify render → draft → submit. log verify.


