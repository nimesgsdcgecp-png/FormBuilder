# FormBuilder3 — Dynamic Form Builder Platform

A full-stack enterprise-grade **Dynamic Form Builder** with drag-and-drop form creation, conditional logic rules, a rule engine, and real-time form submissions stored in auto-generated PostgreSQL tables.

---

## 🚀 Technology Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS            |
| State Mgmt  | Zustand                                                      |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable                             |
| Backend     | Spring Boot 3, Java 21                                       |
| ORM         | Spring Data JPA / Hibernate, Spring JDBC                     |
| Database    | PostgreSQL (with JSONB for validation rules)                 |
| Build       | Maven (backend), npm (frontend)                              |

---

## 🏗️ Core Architecture & Application Flow

FormBuilder3 operates on a unified model separated into **Metadata** and **Dynamic Execution**.

### 1. Form Creation & Management
- **Frontend**: The `builder/page.tsx` handles drag-and-drop creation via `Canvas.tsx` and `Sidebar.tsx`. Field configuration happens in `PropertiesPanel.tsx`.
- **Backend**: Saving the form calls `FormController` > `FormService`. The form's state is saved in the `forms` table. Each save generates a new version in `form_versions` for full traceability. Individual fields mirror the `FieldType` enum.

### 2. Publishing & Dynamic Tables
- **Action**: When a form's status changes to `PUBLISHED`, the system prepares it to receive public submissions.
- **Dynamic DDL (`DynamicTableService.java`)**: Instead of relying on a slow, monolithic NoSQL structure or gigantic EAV tables, FormBuilder3 executes raw `CREATE TABLE` and `ALTER TABLE` DDL directly against PostgreSQL.
    - Example: Publishing Form ID 5 creates a real table named `sub_5_v1`.
    - Evolving schemas: Adding a new field to a published form will execute `ALTER TABLE sub_5_v1 ADD COLUMN ...`.

### 3. Submission & Validation (Rule Engine)
- **Public Entry (`f/[token]/page.tsx`)**: Forms generate a UUID token for public sharing.
- **Execution**: When a user submits data, it hits `SubmissionService.java`.
- **Validation Phase**: Before data is saved, `RuleEngineService.java` intercepts the request. It evaluates the pre-configured JSON rules (IF→THEN statements).
    - If a `REQUIRE` or `VALIDATION_ERROR` action triggers, a HTTP 400 stops the submission entirely.
- **Data Insertion**: Validated data is serialized dynamically (arrays into JSON strings) and explicitly inserted using raw Spring JDBC against the dynamic table (`INSERT INTO "sub_5_v1" ...`). SQL identifiers are strictly double-quoted to defend against reserved postgres keywords.

---

## 📁 Key File Map

| System Component | Key Files | Description |
|------------------|-----------|-------------|
| **Types & API Layer** | `schema.ts`, `api.ts` | The frontend single-source of truth. `schema.ts` explicitly mirrors backend Java enums (`FieldType`, `ActionType`). |
| **API Endpoints** | `FormController.java`, `FileUploadController.java` | The routing layer on the backend. Files are uploaded directly to the local filesystem for dev (via `uploads/`). |
| **Data Manipulation** | `SubmissionService.java`, `DynamicTableService.java` | Core business logic using `JdbcTemplate` to execute dynamic DML and DDL. |
| **Validation Engine** | `RuleEngineService.java` | Handles the synchronous checking of `FormRuleDTO` logic before any insert operations. |

---

## 🗄️ Database Schema Summary

- `forms`: Core metadata (ID, title, target table name, share token).
- `form_versions`: Snapshot representations (JSON `rules`, version number).
- `form_fields`: Individual column configurations (type, validation constraints, column names).
- `sub_{id}_v1`: The dynamic tables holding the actual submitted data.

---

## 🏃 Running Locally

### Prerequisites
- Java 21+ & Maven 3.9+
- Node.js 18+
- PostgreSQL 14+

### 1. Backend
1. Edit `/formbuilder-backend1/src/main/resources/application.properties` with your local Postgres credentials.
2. Ensure the `jdbc:postgresql://localhost:5432/formbuilder_db` database exists.
```bash
cd formbuilder-backend1
mvn spring-boot:run
# Backend boots on http://localhost:8080
```

### 2. Frontend
```bash
cd formbuilder-frontend1
npm install
npm run dev
# Frontend boots on http://localhost:3000
```
