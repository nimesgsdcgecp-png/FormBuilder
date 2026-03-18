# FormBuilder3 — Dynamic Form Builder Platform

A full-stack enterprise-grade **Dynamic Form Builder** with drag-and-drop form creation, conditional logic rules, a rule engine, and real-time form submissions stored in auto-generated PostgreSQL tables.

---

## 🚀 Technology Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Frontend    | Next.js 14 (App Router), TypeScript, Tailwind CSS            |
| State Mgmt  | Zustand                                                      |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable                             |
| Backend     | Spring Boot 3, Java 17                                       |
| ORM         | Spring Data JPA / Hibernate, Spring JDBC                     |
| Database    | PostgreSQL (with JSONB for validation rules)                 |
| Build       | Maven (backend), npm (frontend)                              |

---

## 🏗️ Core Architecture & Application Flow

FormBuilder3 operates on a unified model separated into **Metadata** and **Dynamic Execution**.

### 1. Form Creation & Management
- **Frontend**: The `builder/page.tsx` handles drag-and-drop creation via `Canvas.tsx` and `Sidebar.tsx`. Field configuration happens in `PropertiesPanel.tsx`.
- **Backend (Modular Architecture)**: Logic is decoupled into dedicated services:
    - `FormService`: Core lifecycle (CRUD/Archive).
    - `FormMapper`: Centralized Entity-to-DTO conversion.
    - `FormWorkflowService`: Specialized form state transitions.

### 2. Publishing & Dynamic Tables
- **Action**: When a form's status changes to `PUBLISHED`, the system prepares it to receive public submissions.
- **Dynamic DDL (`DynamicTableService.java`)**: 
    - FormBuilder3 executes raw `CREATE TABLE` and `ALTER TABLE` DDL directly against PostgreSQL for high-performance structured storage.
    - `DynamicTableService` also acts as a generic Data Access Object (DAO) for dynamic tables, handling all custom JDBC I/O.

### 3. Submission & Validation (Rule Engine)
- **Public Entry (`f/[token]/page.tsx`)**: Forms generate a UUID token for public sharing.
- **Execution**: When a user submits data, it hits `SubmissionService.java`.
- **Validation phase**: `RuleEngineService.java` evaluates pre-configured JSON rules (IF→THEN).
- **Calculation Phase**: `CalculationService.java` evaluates server-side math expressions for calculated field types before insertion.
- **Data Insertion**: Validated data is explicitly inserted into the dynamic table.SQL identifiers are strictly double-quoted to defend against reserved postgres keywords.

---

## ⚡ Performance Optimization

### Smart Polling & Tab-Visibility
The frontend implements a visibility-aware polling system:
- **Redundancy Reduction**: Redundant background polling is consolidated into a single global state in `useUIStore.ts`.
- **Visibility Detection**: Background requests pause automatically when the tab is inactive (via `visibilitychange` API), significantly reducing unnecessary server load and database queries.

---

## 📁 Key File Map

| System Component | Key Files | Description |
|------------------|-----------|-------------|
| **Types & API Layer** | `schema.ts`, `api.ts` | The frontend single-source of truth. |
| **Data Manipulation** | `SubmissionService.java`, `CalculationService.java` | Submission pipeline with server-side math evaluation. |
| **Logic Engine** | `RuleEngineService.java`, `FormMapper.java` | Rule validation and Entity-DTO mapping. |
| **Table Management** | `DynamicTableService.java` | Core business logic for executing dynamic DML and DDL via `JdbcTemplate`. |

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
