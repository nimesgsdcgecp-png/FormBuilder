# FormBuilder3 — Dynamic Form Builder Platform

A full-stack enterprise-grade **Dynamic Form Builder** with drag-and-drop form creation, conditional logic rules, a rule engine, and real-time form submissions stored in auto-generated PostgreSQL tables.

---

## 📁 Project Structure

```
FormBuilder3/
├── formbuilder-backend1/         # Spring Boot 3 REST API
│   ├── src/main/java/com/sttl/formbuilder2/
│   │   ├── controller/           # REST controllers
│   │   ├── dto/
│   │   │   ├── request/          # Inbound DTOs (HTTP request bodies)
│   │   │   └── response/         # Outbound DTOs (HTTP responses)
│   │   ├── model/
│   │   │   ├── entity/           # JPA entities (Form, FormVersion, FormField)
│   │   │   └── enums/            # FieldType, FormStatus, RuleOperator, etc.
│   │   ├── repository/           # Spring Data JPA repositories
│   │   └── service/              # Business logic
│   │       ├── FormService.java
│   │       ├── DynamicTableService.java  # CREATE/ALTER PostgreSQL tables
│   │       ├── SubmissionService.java
│   │       └── RuleEngineService.java
│   └── pom.xml
│
└── formbuilder-frontend1/        # Next.js 14 App Router frontend
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # Dashboard (form list)
    │   │   ├── builder/page.tsx   # Form Builder (create/edit)
    │   │   ├── forms/[id]/responses/page.tsx  # Responses viewer
    │   │   └── f/[token]/         # Public form (fill-in view via token)
    │   ├── components/builder/
    │   │   ├── Sidebar.tsx        # Draggable field palette
    │   │   ├── Canvas.tsx         # Drop zone for fields
    │   │   ├── SortableField.tsx  # Single field card (sortable)
    │   │   ├── PropertiesPanel.tsx # Right-side field properties editor
    │   │   └── LogicPanel.tsx     # Rule / conditional logic editor
    │   ├── services/api.ts        # All API calls (fetch wrappers)
    │   ├── store/useFormStore.ts  # Zustand state management
    │   └── types/schema.ts        # TypeScript types for the form schema
    └── package.json
```

---

## 🚀 Technology Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS            |
| State Mgmt  | Zustand                                                      |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable                             |
| Notifications | sonner (toast)                                             |
| Backend     | Spring Boot 3, Java 21                                       |
| ORM         | Spring Data JPA / Hibernate                                  |
| Database    | PostgreSQL (with JSONB for validation rules)                 |
| Build       | Maven (backend), npm (frontend)                              |

---

## 🧩 Key Features

### Form Builder
- **Drag-and-drop** field reordering from a sidebar palette
- **Field types**: TEXT, NUMERIC, DATE, TIME, BOOLEAN, TEXTAREA, DROPDOWN, RADIO, CHECKBOX_GROUP, RATING, SCALE, FILE, GRID_RADIO, GRID_CHECK, LOOKUP
- **Properties panel** for each field: label, default value, options, validation rules
- **Column name** auto-generated from field label (snake_case SQL safe)
- **Versioning**: every save creates a new form version (full audit trail)

### Conditional Logic (Rule Engine)
- Visual rule editor: IF [field] [operator] [value] → THEN [action] [target]
- **Operators**: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, CONTAINS
- **Actions**: SHOW, HIDE, REQUIRE, VALIDATION_ERROR, SEND_EMAIL
- Rules are stored as JSON in the `form_versions` table and enforced server-side on submission

### Dynamic Database Tables
- On **PUBLISH**, a PostgreSQL table (`sub_{formId}_v1`) is auto-created via DDL
- Schema evolution via `ALTER TABLE ADD COLUMN` when fields are added to a published form
- `CREATE TABLE IF NOT EXISTS` ensures re-publishing is idempotent

### Public Share Links
- Each form gets a UUID-based `publicShareToken`
- Public URL: `/f/{token}` — fillable by anyone without authentication
- Token is displayed in the builder header for copying

### Responses Viewer
- Table view of all submissions with ghost-column detection for archived fields
- CSV export, single-response editing, and per-response deletion
- Supports File download links for FILE-type fields

---

## ⚙️ Backend API Reference

### Forms

| Method | Endpoint | Request DTO | Response DTO | Description |
|--------|----------|-------------|--------------|-------------|
| GET | `/api/forms` | — | `FormSummaryResponseDTO[]` | List all non-archived forms |
| POST | `/api/forms` | `CreateFormRequestDTO` | `Form` | Create a new form |
| GET | `/api/forms/{id}` | — | `FormDetailResponseDTO` | Get form with all versions |
| PUT | `/api/forms/{id}` | `UpdateFormRequestDTO` | `Form` | Update form (creates new version) |
| DELETE | `/api/forms/{id}` | — | 204 | Soft-delete (archive) |
| GET | `/api/forms/public/{token}` | — | `FormDetailResponseDTO` | Public form by token |

### Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forms/{id}/submissions` | All submissions for a form |
| POST | `/api/forms/{id}/submissions` | Submit data |
| GET | `/api/forms/{id}/submissions/{submissionId}` | Single submission |
| PUT | `/api/forms/{id}/submissions/{submissionId}` | Update submission |
| DELETE | `/api/forms/{id}/submissions/{submissionId}` | Delete submission |
| POST | `/api/forms/public/{token}/submissions` | Submit via public token |

### Lookup

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forms/{id}/columns/{columnName}/values` | Distinct values for a LOOKUP dropdown |

---

## 🗄️ Database Schema

### `forms`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | Auto-generated |
| `title` | VARCHAR | Form name |
| `description` | TEXT | |
| `status` | VARCHAR | DRAFT / PUBLISHED / ARCHIVED |
| `target_table_name` | VARCHAR(64) UNIQUE | e.g. `sub_5_v1` |
| `public_share_token` | VARCHAR UNIQUE | UUID for public sharing |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-updated |

### `form_versions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `form_id` | FK → forms | |
| `version_number` | INTEGER | Increments on each save |
| `change_log` | TEXT | Human-readable description |
| `rules` | TEXT | JSON array of FormRuleDTO |
| `created_at` | TIMESTAMP | |

### `form_fields`
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL PK | |
| `form_version_id` | FK → form_versions | |
| `field_label` | VARCHAR | |
| `column_name` | VARCHAR(64) | SQL-safe, auto-derived |
| `field_type` | VARCHAR | Enum: FieldType |
| `is_mandatory` | BOOLEAN | |
| `default_value` | VARCHAR | |
| `validation_rules` | JSONB | min, max, pattern, minLength, maxLength |
| `field_options` | TEXT | JSON string (array or object) |
| `ordinal_position` | INTEGER | Display order |

---

## 🏃 Running Locally

### Prerequisites
- Java 21+
- Maven 3.9+
- Node.js 18+
- PostgreSQL 14+ (running locally)

### Backend
```bash
cd formbuilder-backend1
# Edit src/main/resources/application.properties with your DB credentials
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd formbuilder-frontend1
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 🐛 Known Bugs Fixed (March 2026)

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | Rule engine & Logic panel crashed on existing forms | `...f.validationRules` spread threw `TypeError` when `validationRules` was `null` for a field | Guarded with `...(f.validationRules \|\| {})` in builder `useEffect` |
| 2 | Rules not saved on form creation | `FormService.createForm` never called `version.setRules(...)` | Added rule serialization to `createForm` |
| 3 | Publish fails after Save Draft | `CREATE TABLE` (without `IF NOT EXISTS`) threw "relation already exists" when re-publishing | Changed to `CREATE TABLE IF NOT EXISTS` in `DynamicTableService` |
| 4 | Options parse error console noise | Old forms stored `"Yes,No"` instead of JSON; frontend logged `SyntaxError` before falling back | Already has split-fallback; backend now marks these as legacy gracefully |
| 5 | Status not loaded on edit | `useFormStore` never called `setStatus` when loading a form for edit | Added `setStatus` action and call it in the builder `useEffect` |

---

## 🏗️ DTO Architecture (Request/Response Split)

```
dto/
├── request/
│   ├── CreateFormRequestDTO        # POST /api/forms
│   ├── UpdateFormRequestDTO        # PUT /api/forms/{id}
│   ├── FieldDefinitionRequestDTO   # Field within a form request
│   ├── FormRuleRequestDTO          # Conditional rule within a request
│   ├── RuleConditionRequestDTO     # IF clause of a rule
│   └── RuleActionRequestDTO        # THEN clause of a rule
│
└── response/
    ├── FormSummaryResponseDTO      # GET /api/forms (lightweight list)
    ├── FormDetailResponseDTO       # GET /api/forms/{id} (full detail)
    ├── FormVersionResponseDTO      # Version within a form detail response
    └── FormFieldResponseDTO        # Field within a version response
```

Legacy DTOs (`FormDefinitionDTO`, `FormFieldDTO`, `FormVersionDTO`, `FormDetailDTO`, `FormResponseDTO`) are retained for backward compatibility and are used internally by `SubmissionService`/`RuleEngineService` for deserializing persisted JSON rule data.

---

## 📋 Context Prompt (for AI Assistants)

See the section below for the full context prompt.
