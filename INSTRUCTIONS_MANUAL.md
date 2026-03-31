# FormBuilder3 - Comprehensive Instructions Manual for AI Analysis

**Document Version:** 1.0
**Last Updated:** March 27, 2026
**Purpose:** Complete project guide for AI systems to understand and analyze the FormBuilder3 application

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Key Features & Components](#key-features--components)
9. [Data Flow & Workflows](#data-flow--workflows)
10. [Security Implementation](#security-implementation)
11. [Configuration & Setup](#configuration--setup)
12. [Recent Changes & Current Status](#recent-changes--current-status)

---

## PROJECT OVERVIEW

### 🎯 Purpose
FormBuilder3 is an **enterprise-grade, metadata-driven dynamic form management system** that enables creation of complex, versioned forms with physical PostgreSQL backing. It bridges flexible UI design with structured database storage.

### 📊 Key Statistics
| Metric | Value |
|--------|-------|
| Backend Classes | 100+ |
| Frontend Components | 20+ |
| API Endpoints | 50+ |
| Database Entities | 16 |
| Max Fields/Form | 50 |
| Max Validations/Form | 100 |
| Max Pages/Form | 10 |

### 🎓 Application Tier
- **Frontend:** Next.js 16.1.6 with React 19.2.3
- **Backend:** Spring Boot 3.5.11 with Java 21
- **Database:** PostgreSQL 14+
- **Architecture Pattern:** REST API + Component-based UI

### ✅ Status
- **Production-Ready:** Yes
- **Version:** 1.0.0
- **Deployment:** Modular (Backend & Frontend separate)

---

## TECHNOLOGY STACK

### Frontend (Client-Side)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5+ | Type-safe JavaScript |
| **Tailwind CSS** | 4.2.1 | Utility-first CSS framework |
| **Zustand** | 5.0.11 | State management (lightweight) |
| **@dnd-kit** | 6.3.1 | Drag-and-drop library |
| **Lucide React** | 0.575.0 | Icon library |
| **Sonner** | 2.0.7 | Toast notifications |
| **JSPDF** | 4.2.0 | PDF export |
| **XLSX** | 0.18.5 | Excel export |
| **UUID** | 13.0.0 | Unique ID generation |

### Backend (Server-Side)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.5.11 | REST framework |
| **Java** | 21 | Programming language |
| **Spring Data JPA** | (included) | ORM abstraction |
| **Spring Security** | 6.4+ | Authentication/Authorization |
| **Spring Validation** | (included) | Request validation |
| **PostgreSQL Driver** | (latest) | Database connectivity |
| **Lombok** | (latest) | Code annotation processor |
| **SpringDoc OpenAPI** | 2.8.6 | REST API documentation (Swagger) |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 14+ | Relational database |

### Development Tools
- **Build Tool:** Maven (Backend), npm (Frontend)
- **Version Control:** Git
- **IDE Support:** IntelliJ IDEA, VS Code
- **API Documentation:** Swagger UI (available at `/swagger-ui.html`)

---

## PROJECT STRUCTURE

### 📁 Directory Layout

```
FormBuilder3/
│
├── 📂 formbuilder-backend1/              # Spring Boot Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/sttl/formbuilder2/
│   │   │   │   ├── Formbuilder2Application.java    # Main entry point
│   │   │   │   ├── controller/                     # REST Controllers
│   │   │   │   │   ├── FormController.java
│   │   │   │   │   ├── AuthController.java
│   │   │   │   │   ├── RuntimeController.java
│   │   │   │   │   ├── FormVersionController.java
│   │   │   │   │   ├── UserController.java
│   │   │   │   │   ├── RoleController.java
│   │   │   │   │   ├── PermissionController.java
│   │   │   │   │   ├── ModuleController.java
│   │   │   │   │   ├── AuditController.java
│   │   │   │   │   ├── ProfileController.java
│   │   │   │   │   ├── MenuController.java
│   │   │   │   │   ├── FileUploadController.java
│   │   │   │   │   ├── RoleModuleController.java
│   │   │   │   │   ├── WorkflowController.java
│   │   │   │   │   └── LevelUpController.java
│   │   │   │   │
│   │   │   │   ├── service/                        # Business Logic
│   │   │   │   │   ├── FormService.java            # Form CRUD & versioning
│   │   │   │   │   ├── FormSubmissionService.java  # Submission handling
│   │   │   │   │   ├── DynamicTableService.java    # Dynamic SQL generation
│   │   │   │   │   ├── RuleEvaluationService.java  # Rule/Logic evaluation
│   │   │   │   │   ├── UserService.java
│   │   │   │   │   ├── RoleService.java
│   │   │   │   │   ├── AuditService.java
│   │   │   │   │   ├── FileUploadService.java
│   │   │   │   │   └── (Additional services)
│   │   │   │   │
│   │   │   │   ├── repository/                     # Data Access Layer (JPA)
│   │   │   │   │   ├── FormRepository.java
│   │   │   │   │   ├── FormVersionRepository.java
│   │   │   │   │   ├── FormFieldRepository.java
│   │   │   │   │   ├── FormSubmissionMetaRepository.java
│   │   │   │   │   ├── UserRepository.java
│   │   │   │   │   ├── RoleRepository.java
│   │   │   │   │   ├── AuditLogRepository.java
│   │   │   │   │   └── (Additional repositories)
│   │   │   │   │
│   │   │   │   ├── model/
│   │   │   │   │   ├── entity/                     # JPA Entities
│   │   │   │   │   │   ├── Form.java
│   │   │   │   │   │   ├── FormVersion.java
│   │   │   │   │   │   ├── FormField.java
│   │   │   │   │   │   ├── FieldValidation.java
│   │   │   │   │   │   ├── FormSubmissionMeta.java
│   │   │   │   │   │   ├── AppUser.java
│   │   │   │   │   │   ├── Role.java
│   │   │   │   │   │   ├── Permission.java
│   │   │   │   │   │   ├── Module.java
│   │   │   │   │   │   ├── RoleModule.java
│   │   │   │   │   │   ├── UserFormRole.java
│   │   │   │   │   │   ├── AuditLog.java
│   │   │   │   │   │   ├── SystemConfiguration.java
│   │   │   │   │   │   ├── LevelUpRequest.java
│   │   │   │   │   │   ├── WorkflowInstance.java
│   │   │   │   │   │   └── WorkflowStep.java
│   │   │   │   │   │
│   │   │   │   │   └── enums/                      # Enumerations
│   │   │   │   │       ├── FieldType.java
│   │   │   │   │       ├── FormStatus.java
│   │   │   │   │       ├── ActionType.java
│   │   │   │   │       └── ConditionLogic.java
│   │   │   │   │
│   │   │   │   ├── dto/                            # Data Transfer Objects
│   │   │   │   │   ├── request/                    # Incoming request DTOs
│   │   │   │   │   │   ├── CreateFormRequestDTO.java
│   │   │   │   │   │   ├── FieldDefinitionRequestDTO.java
│   │   │   │   │   │   ├── FieldValidationRequestDTO.java
│   │   │   │   │   │   ├── FormRuleRequestDTO.java
│   │   │   │   │   │   ├── RuleActionRequestDTO.java
│   │   │   │   │   │   ├── RuleConditionRequestDTO.java
│   │   │   │   │   │   ├── RoleRequestDTO.java
│   │   │   │   │   │   └── RoleAssignmentDTO.java
│   │   │   │   │   │
│   │   │   │   │   ├── response/                   # Outgoing response DTOs
│   │   │   │   │   │   ├── FormResponseDTO.java
│   │   │   │   │   │   ├── DashboardStatsResponseDTO.java
│   │   │   │   │   │   └── (Additional response DTOs)
│   │   │   │   │   │
│   │   │   │   │   └── internal/                   # Internal DTOs
│   │   │   │   │       ├── FormRuleDTO.java
│   │   │   │   │       ├── RuleConditionDTO.java
│   │   │   │   │       ├── RuleActionDTO.java
│   │   │   │   │       ├── ConditionGroupDTO.java
│   │   │   │   │       └── RuleConditionEntryDTO.java
│   │   │   │   │
│   │   │   │   ├── config/                         # Spring Configuration
│   │   │   │   │   ├── WebConfig.java              # CORS, web settings
│   │   │   │   │   ├── FormBuilderLimitsConfig.java # SRS limits
│   │   │   │   │   └── SecurityConfig.java         # Security setup
│   │   │   │   │
│   │   │   │   ├── security/                       # Security classes
│   │   │   │   │   ├── CustomUserDetailsService.java
│   │   │   │   │   └── SecurityContextHolder usage
│   │   │   │   │
│   │   │   │   ├── exception/                      # Custom exceptions
│   │   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   │   ├── ValidationException.java
│   │   │   │   │   ├── UnauthorizedException.java
│   │   │   │   │   └── (Additional exceptions)
│   │   │   │   │
│   │   │   │   └── util/                           # Utilities
│   │   │   │       ├── RuleEvaluator.java          # AST-based rule executor
│   │   │   │       ├── FieldTypeResolver.java
│   │   │   │       └── (Utility classes)
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── application.properties          # Spring config
│   │   │       ├── application-dev.properties
│   │   │       ├── schema.sql                      # DB initialization
│   │   │       └── (Other resources)
│   │   │
│   │   └── test/                                   # Test classes
│   │
│   └── pom.xml                                    # Maven configuration
│
├── 📂 formbuilder-frontend1/            # Next.js Frontend
│   ├── src/
│   │   ├── app/                                   # Next.js App Router
│   │   │   ├── page.tsx                           # Dashboard/Home
│   │   │   ├── layout.tsx                         # Root layout
│   │   │   ├── login/page.tsx                     # Login page
│   │   │   ├── register/page.tsx                  # Registration
│   │   │   ├── profile/page.tsx                   # User profile
│   │   │   ├── builder/
│   │   │   │   ├── page.tsx                       # Form builder page
│   │   │   │   └── preview/page.tsx               # Form preview
│   │   │   ├── forms/
│   │   │   │   └── [id]/responses/page.tsx        # Form responses
│   │   │   ├── f/[token]/page.tsx                 # Public form submission
│   │   │   └── admin/
│   │   │       ├── layout.tsx
│   │   │       ├── approvals/page.tsx
│   │   │       ├── approvals/history/page.tsx
│   │   │       ├── audit/page.tsx
│   │   │       ├── modules/page.tsx
│   │   │       ├── role-modules/page.tsx
│   │   │       ├── roles/page.tsx
│   │   │       └── users/page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── AppShell.tsx                       # Layout wrapper
│   │   │   ├── Header.tsx                         # Top navigation
│   │   │   ├── FormRenderer.tsx                   # Dynamic form renderer
│   │   │   ├── builder/
│   │   │   │   ├── Canvas.tsx                     # Main editing canvas
│   │   │   │   ├── Sidebar.tsx                    # Field palette
│   │   │   │   ├── PropertiesPanel.tsx            # Field properties editor
│   │   │   │   ├── LogicPanel.tsx                 # Rule builder
│   │   │   │   ├── VersionsPanel.tsx
│   │   │   │   ├── CustomValidationsPanel.tsx
│   │   │   │   ├── SortableField.tsx              # D&D field
│   │   │   │   └── DraggableSidebarBtn.tsx
│   │   │   └── ui/
│   │   │       └── (Atomic UI components)
│   │   │
│   │   ├── store/                                 # Zustand state stores
│   │   │   ├── useFormStore.ts                    # Form editing state
│   │   │   ├── useUIStore.ts                      # UI state
│   │   │   └── (Additional stores)
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                             # API client
│   │   │   ├── formService.ts
│   │   │   ├── authService.ts
│   │   │   └── (Additional services)
│   │   │
│   │   ├── hooks/                                 # React hooks
│   │   │   └── (Custom hooks)
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts                           # Central type definitions
│   │   │   └── (Type interfaces)
│   │   │
│   │   └── utils/                                 # Utilities
│   │       ├── constants.ts
│   │       ├── validators.ts
│   │       └── (Utility functions)
│   │
│   ├── package.json                              # NPM dependencies
│   ├── tailwind.config.js                        # Tailwind config
│   ├── next.config.js                            # Next.js config
│   └── tsconfig.json                             # TypeScript config
│
├── 📄 ARCHITECTURE.md                             # System design
├── 📄 DOCUMENTATION.md                            # API reference
├── 📄 IMPLEMENTATION_GUIDE.md                     # Setup guide
├── 📄 SECURITY_AUDIT.md                           # Security analysis
├── 📄 README.md                                   # Project overview
└── 📄 INSTRUCTIONS_MANUAL.md                      # This file

```

---

## BACKEND ARCHITECTURE

### 🏗️ Architecture Pattern
The backend follows **layered architecture** with clear separation:

```
┌─────────────────────────────────────────┐
│         Controller Layer (REST)         │
│    ↓ Handle HTTP Requests/Responses ↓   │
├─────────────────────────────────────────┤
│         Service Layer (Logic)           │
│    ↓ Business Logic & Orchestration ↓   │
├─────────────────────────────────────────┤
│      Repository Layer (Data Access)     │
│    ↓ Query JPA Entities ↓               │
├─────────────────────────────────────────┤
│    PostgreSQL Database (Entities)       │
│    + Dynamic Tables (sub_form_X_vY)     │
└─────────────────────────────────────────┘
```

### 🎯 Core Controllers
Each controller handles a functional domain:

| Controller | Path | Responsibility |
|------------|------|-----------------|
| **FormController** | `/api/v1/forms` | Form CRUD, publish, versioning |
| **AuthController** | `/api/v1/auth` | Login, logout, register, session mgmt |
| **RuntimeController** | `/api/v1/runtime` | Form submission & draft endpoints |
| **UserController** | `/api/v1/users` | User management |
| **RoleController** | `/api/v1/roles` | Role CRUD |
| **PermissionController** | `/api/v1/permissions` | Permission management |
| **ModuleController** | `/api/v1/modules` | Module management |
| **AuditController** | `/api/v1/audit` | Audit log retrieval |
| **FormVersionController** | `/api/v1/versions` | Form version history |
| **ProfileController** | `/api/v1/profile` | User profile operations |
| **MenuController** | `/api/v1/menu` | Navigation menu data |
| **FileUploadController** | `/api/v1/upload` | File upload handling |

### 🛠️ Core Services
Services contain business logic and orchestration:

| Service | Purpose |
|---------|---------|
| **FormService** | Form CRUD, publish, versioning, search |
| **FormSubmissionService** | Handle form submissions, validation |
| **DynamicTableService** | Create/modify dynamic PostgreSQL tables |
| **RuleEvaluationService** | Evaluate conditional rules & logic |
| **UserService** | User authentication, registration |
| **RoleService** | Role & permission management |
| **AuditService** | Audit logging for all operations |
| **FileUploadService** | File upload & storage management |

### 📦 Data Transfer Objects (DTOs)
DTOs decouple API contracts from internal entities:

**Request DTOs** - Validate incoming data:
- `CreateFormRequestDTO` - New form creation
- `FieldDefinitionRequestDTO` - Field definitions
- `FormRuleRequestDTO` - Rule definitions
- `RoleRequestDTO` - Role creation

**Response DTOs** - Shape outgoing data:
- `FormResponseDTO` - Form representation
- `DashboardStatsResponseDTO` - Dashboard metrics

**Internal DTOs** - Internal processing:
- `FormRuleDTO` - Rule with conditions & actions
- `RuleConditionDTO` - Individual conditions
- `RuleActionDTO` - Action on rule trigger

### ⚙️ Key Configuration Files

**application.properties:**
```properties
# Database (PostgreSQL)
spring.datasource.url=jdbc:postgresql://localhost:5432/formbuilder2
spring.datasource.username=postgres
spring.datasource.password=root

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=validate    # Strict validation
spring.jpa.show-sql=true                  # Query logging

# Jackson JSON
spring.jackson.serialization.write-enums-using-to-string=true

# Session Security
server.servlet.session.timeout=15m

# SRS Guardrails
formbuilder.limits.max-fields-per-form=50
formbuilder.limits.max-validations-per-form=100
formbuilder.limits.max-pages-per-form=10
formbuilder.limits.max-payload-size-kb=100
```

---

## FRONTEND ARCHITECTURE

### ⚛️ Component Hierarchy
```
<AppShell>
  ├── <Header />              # Navigation & user menu
  ├── <Router>
  │   ├── <Home />            # Dashboard
  │   ├── <Builder>           # Form builder (Draft)
  │   │   ├── <Canvas />      # Editing canvas
  │   │   ├── <Sidebar />     # Field palettes
  │   │   ├── <PropertiesPanel />  # Field config
  │   │   ├── <LogicPanel />  # Rule builder
  │   │   └── <VersionsPanel /> # Version history
  │   ├── <FormRenderer />    # Runtime form display
  │   ├── <Admin>             # Admin pages
  │   │   ├── Users
  │   │   ├── Roles
  │   │   ├── Modules
  │   │   └── Audit
  │   ├── <Login />
  │   └── <Register />
```

### 🎛️ State Management (Zustand Stores)

**useFormStore** - Form editing state:
```typescript
{
  currentForm: Form | null
  fields: FormField[]
  selectedFieldId: string | null
  rules: FormRule[]
  versions: FormVersion[]
  isDirty: boolean
  undoStack: FormState[]
  redoStack: FormState[]

  // Actions
  updateField(fieldId, updates)
  addField(field)
  removeField(fieldId)
  addRule(rule)
  updateRule(ruleId, updates)
  undo()
  redo()
  publish()
  // ... more actions
}
```

**useUIStore** - UI state:
```typescript
{
  sidebarOpen: boolean
  logicPanelOpen: boolean
  versionsPanelOpen: boolean
  selectedTab: string
  isLoading: boolean
  toastMessage: string | null

  // Actions
  toggleSidebar()
  setLoading(bool)
  showToast(message)
  // ... more actions
}
```

### 📡 API Integration (services/api.ts)

**API Client Setup:**
- Base URL: `http://localhost:8080/api/v1`
- Default headers: `Content-Type: application/json`
- Credentials: `include` (for session cookies)
- Error handling with automatic error toast display

**Key API Service Functions:**
```typescript
// Forms
GET /forms - List all forms
POST /forms - Create form
GET /forms/:id - Get form details
PUT /forms/:id - Update form
DELETE /forms/:id - Delete form
POST /forms/:id/publish - Publish form

// Submissions
POST /runtime/submit - Submit form
GET /runtime/drafts/:id - Get draft
POST /runtime/drafts/:id - Save draft

// Auth
POST /auth/login - User login
POST /auth/register - Register user
POST /auth/logout - Logout
GET /auth/me - Current user

// Admin
GET /users - List users
GET /roles - List roles
GET /modules - List modules
POST /audit/logs - Get audit logs
```

### 🎨 Built-in UI Components
Located in `components/ui/`:
- Button, Input, Select, Checkbox
- Modal, Toast, Dropdown
- Card, Badge, Alert
- Table, Pagination
- (Shadcn-inspired atomic components)

---

## DATABASE SCHEMA

### 📊 Entity Relationships

```
┌─────────────────┐
│     FORMS       │  Core form metadata
├─────────────────┤
│ id (PK)         │
│ title           │
│ code (UNIQUE)   │
│ description     │
│ share_token     │
│ status          │
│ created_by_id   │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ (1:N)
         ▼
┌─────────────────┐
│ FORM_VERSIONS   │  Versioned snapshots
├─────────────────┤
│ id (PK)         │
│ form_id (FK)    │
│ version_number  │
│ rules (JSON)    │
│ created_at      │
└────────┬────────┘
         │ (1:N)
         ▼
┌─────────────────┐
│  FORM_FIELDS    │  Field definitions per version
├─────────────────┤
│ id (PK)         │
│ version_id (FK) │
│ column_name     │
│ field_type      │
│ label           │
│ validation_json │
│ order           │
└─────────────────┘

┌──────────────────────────┐
│ FORM_SUBMISSION_META     │  Submission metadata
├──────────────────────────┤
│ id (PK)                  │
│ form_id (FK)             │
│ submitted_by_id (FK)     │
│ submitted_at             │
│ table_name               │  (e.g., "sub_form_1_v2")
│ status                   │
└──────────────────────────┘

Dynamic Tables (Created per form version):
sub_form_1_v1 (columns from FormField)
sub_form_1_v2 (columns from FormField)
sub_form_2_v1 (columns from FormField)
```

### 🔐 Identity & Security Entities

```
┌──────────────────┐
│    APP_USER      │  Users
├──────────────────┤
│ id (PK)          │
│ username (UNIQUE)│
│ password (HASHED)│
│ email            │
│ created_at       │
└────────┬─────────┘
         │ (M:N through USER_ROLE)
         ▼
┌──────────────────┐
│     ROLE         │  Roles
├──────────────────┤
│ id (PK)          │
│ name             │
│ description      │
└────────┬─────────┘
         │ (M:N through ROLE_MODULE)
         ▼
┌──────────────────┐
│    MODULE        │  Feature modules
├──────────────────┤
│ id (PK)          │
│ name             │
│ code             │
└──────────────────┘
```

### 🎛️ Configuration & Audit

```
┌──────────────────────────┐
│ SYSTEM_CONFIGURATION     │  System settings
├──────────────────────────┤
│ id (PK)                  │
│ config_key               │
│ config_value (JSON)      │
└──────────────────────────┘

┌──────────────────────────┐
│     AUDIT_LOG            │  Audit trail
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK)             │
│ action                   │  (CREATE, UPDATE, DELETE, etc.)
│ entity_type              │
│ entity_id                │
│ changes (JSON)           │
│ created_at               │
└──────────────────────────┘
```

### Supported FieldType Enum
```java
TEXT, NUMERIC, DATE, DATETIME, CHECKBOX, RADIO,
SELECT, MULTI_SELECT, TEXTAREA, EMAIL, PHONE,
FILE, IMAGE, SIGNATURE, RATING, SLIDER, GRID,
LOOKUP, CALCULATED, SECTION_HEADER, PAGE_BREAK,
HIDDEN, BARCODE, QR_CODE, DROPDOWN, TOGGLE,
TIME, CURRENCY, PERCENTAGE, RICH_TEXT, LOCATION,
AUTOCOMPLETE, LINKEDFORM, ...
```

### Supported FormStatus Enum
```
DRAFT, PUBLISHED, ARCHIVED, INACTIVE, ACTIVE
```

---

## API ENDPOINTS

### 🔐 Authentication Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|-----------------|
| POST | `/auth/login` | User login | No |
| POST | `/auth/register` | User registration | No |
| POST | `/auth/logout` | User logout | Yes |
| GET | `/auth/me` | Get current user | Yes |

### 📋 Form Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/forms` | List all forms | Yes |
| POST | `/forms` | Create new form | Yes |
| GET | `/forms/:id` | Get form details | Yes |
| PUT | `/forms/:id` | Update form | Yes |
| DELETE | `/forms/:id` | Delete form | Yes |
| POST | `/forms/:id/publish` | Publish form (create version) | Yes |
| GET | `/forms/:id/versions` | Get form versions | Yes |
| GET | `/forms/:id/submissions` | Get submissions for form | Yes |
| GET | `/forms?status=DRAFT` | Filter by status | Yes |
| GET | `/forms/:id/fields` | Get form fields | Yes |

### 🎯 Form Submission (Runtime) Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/runtime/submit` | Submit form response | No (public) |
| GET | `/runtime/:formId/:submitId` | Get submission | Varies |
| GET | `/runtime/drafts/:id` | Get draft submission | Yes/No |
| POST | `/runtime/drafts/:id` | Save draft | Yes/No |
| POST | `/runtime/preview` | Preview form logic | Yes |

### 👥 User Management Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/users` | List users | Yes |
| POST | `/users` | Create user | Yes |
| GET | `/users/:id` | Get user details | Yes |
| PUT | `/users/:id` | Update user | Yes |
| DELETE | `/users/:id` | Delete user | Yes |
| POST | `/users/:id/roles` | Assign roles to user | Yes |
| GET | `/users/:id/permissions` | Get user permissions | Yes |

### 🔑 Role & Permission Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/roles` | List all roles | Yes |
| POST | `/roles` | Create role | Yes |
| PUT | `/roles/:id` | Update role | Yes |
| GET | `/permissions` | List permissions | Yes |
| POST | `/role-modules` | Assign modules to role | Yes |
| GET | `/role-modules` | Get role-module mappings | Yes |

### 📊 Admin Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/dashboard` | Dashboard statistics | Yes |
| GET | `/audit/logs` | Get audit logs | Yes |
| GET | `/modules` | List system modules | Yes |
| POST | `/modules` | Create module | Yes |
| GET | `/menu` | Get navigation menu | Yes |

### 📤 File Upload Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/upload` | Upload file | Yes |
| GET | `/files/:id` | Download file | Yes |
| DELETE | `/files/:id` | Delete file | Yes |

---

## KEY FEATURES & COMPONENTS

### 🏗️ Form Building (Builder Canvas)

**Features:**
- **Drag-and-Drop Interface**: Using `@dnd-kit`, add/reorder fields intuitively
- **30+ Field Types**: TEXT, NUMERIC, GRID, LOOKUP, CALCULATED, etc.
- **Field Properties Panel**: Edit label, placeholder, validation rules
- **Preview Mode**: Real-time preview of form rendering
- **Multiple Pages**: Support for multi-page forms
- **Field Validation**: Predefined + custom validation rules

**Key Components:**
- `Canvas.tsx` - Main editing surface with D&D
- `PropertiesPanel.tsx` - Field configuration
- `Sidebar.tsx` - Available field types palette
- `SortableField.tsx` - D&D field wrapper
- `VersionsPanel.tsx` - Version history

### 🎯 Rule Engine (Conditional Logic)

**Capabilities:**
- **IF-THEN Logic**: Conditional field visibility, validation
- **AST-Based Evaluation**: Server-side rule validation (prevent tampering)
- **Live Evaluation**: Real-time rule execution in browser
- **Complex Conditions**: Nested AND/OR conditions
- **Actions on Trigger**: Hide/show, enable/disable, set value, validate

**Data Structure:**
```typescript
FormRule {
  id: string
  name: string
  conditions: RuleCondition[] // IF clause
  actions: RuleAction[]         // THEN clause
  conditionLogic: "AND" | "OR"  // How to combine conditions
}

RuleCondition {
  fieldId: string
  operator: "equals", "contains", "greaterThan", etc.
  value: any
}

RuleAction {
  targetFieldId: string
  actionType: "show", "hide", "require", "setValue"
  actionValue?: any
}
```

**Logic Panel Component:** `LogicPanel.tsx` - Visual rule builder

### 🔄 Form Versioning & Publishing

**Workflow:**
1. User creates/edits form in **DRAFT** mode
2. User clicks **Publish**
3. System creates immutable `FormVersion` snapshot
4. Backend generates dynamic PostgreSQL table (e.g., `sub_form_1_v2`)
5. Form transitions to **PUBLISHED** state
6. Previous version remains in database (full auditability)

**Implementation:**
- `FormVersion` entity stores rules JSON + metadata
- `FormField` linked to specific version
- New submissions always use latest version
- Submissions stored in dynamic table (e.g., `sub_form_1_v2`)

### ✅ Validation System

**Two-Layer Validation:**

1. **Client-Side (Browser):**
   - Real-time feedback
   - Rule evaluation using stored rule definitions
   - Quick UX response

2. **Server-Side (Backend):**
   - Rule evaluation (prevent tampering)
   - Schema validation (table columns exist)
   - Data type checking
   - Custom validation logic

**Validation Types:**
- **Built-in**: required, email, phone, numeric format
- **Custom**: Regular expressions, length constraints
- **Conditional**: Rule-based (hide/show validator)
- **Remote**: Server-side validation via API

### 📊 Calculated Fields

**Purpose:** Real-time computation of fields from other field values

**Example:**
```json
{
  "fieldId": "total_price",
  "expression": "({quantity} * {unit_price}) * (1 + {tax_rate})",
  "displayFormat": "currency"
}
```

**Implementation:**
- Expression parser evaluates field references
- Server-side evaluation for data integrity
- Real-time browser evaluation for UX

### 🔒 Access Control

**Role-Based Access Control (RBAC):**
- **Roles**: Admin, Mentor, Intern (customizable)
- **Permissions**: Granular per-action permissions
- **Modules**: Feature grouping for role assignment
- **Session-Based**: User login creates JSESSIONID

**Role Hierarchy:**
- Admin: Full system access
- Mentor: Can create/publish forms, approve submissions
- Intern: Can submit forms, limited access

### 📝 Audit Logging

**Captured Events:**
- Form created/updated/deleted
- Form published (version created)
- Submission received
- User login/logout
- Role/permission changes
- File uploads

**Audit Log Structure:**
```java
{
  userId: Long,
  action: String,        // "CREATE", "UPDATE", "DELETE", etc.
  entityType: String,    // "Form", "User", "Role", etc.
  entityId: Long,
  changes: Map<String, Object>,  // Before/after
  createdAt: Timestamp
}
```

**Frontend:** `AuditController` - View audit logs

### 📤 File Upload

**Supported:**
- Max file size: 5 MB
- Max request size: 10 MB
- Allowed types: PDF, DOCX, CSV, XLSX, images
- Stored: Server filesystem or cloud storage

**API:**
```
POST /upload
Content-Type: multipart/form-data
Body: { file: <binary> }

Response:
{
  fileId: UUID,
  fileName: string,
  url: string,
  size: number
}
```

### 🔗 Shared Form Access

**Public Form Submission (No Auth Required):**
- Generate UUID `share_token` for each published form
- Public link: `/f/{share_token}`
- Anyone can submit form without login
- Submissions stored with null user_id (anonymous)

**Access Control:**
- Forms can be "Public" (shareable) or "Private" (auth-only)
- Share token is UUID (prevents ID enumeration)
- Backend validates token before allowing submission

---

## DATA FLOW & WORKFLOWS

### 🔄 Form Creation to Submission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           FORM CREATION WORKFLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. USER INITIATES FORM CREATION
   Frontend: POST /forms
   Request: { title, description, code }
   ↓
2. BACKEND CREATES FORM ENTITY
   FormService.createForm()
   - Creates Form entity (status = DRAFT)
   - Initializes empty FormField array
   - Returns FormResponseDTO
   ↓
3. FRONTEND LOADS FORM IN BUILDER
   useFormStore.setCurrentForm()
   Canvas + PropertiesPanel UI renders
   ↓
4. USER ADDS FIELDS & RULES
   Frontend: User adds fields via D&D
   Zustand store: useFormStore.addField()
   - Each field stored in memory
   - Real-time UI updates
   ↓
5. OPTIONAL: PREVIEW & SAVE DRAFT
   Frontend: PUT /forms/:id
   Backend: FormService.updateForm()
   - Updates Form entity
   - Saves field definitions
   ↓
6. USER PUBLISHES FORM
   Frontend: POST /forms/:id/publish
   ↓
7. BACKEND PUBLISH PROCESS
   FormService.publishForm()

   a) Validate form (fields, rules)
   b) Create FormVersion entity
   c) Serialize rules to JSON
   d) Create FormField records for each field
   e) Generate SQL for dynamic table

      CREATE TABLE "sub_form_1_v2" (
        submission_id SERIAL PRIMARY KEY,
        field_name_1 VARCHAR(255),
        field_name_2 INTEGER,
        submitted_at TIMESTAMP,
        created_by_id INTEGER
      )

   f) Execute CREATE TABLE
   g) Update Form.status to PUBLISHED
   h) Generate share_token (UUID)

   → Emit AuditLog event
   → Return FormResponseDTO
   ↓
8. FORM IS NOW LIVE
   Public link: /f/{share_token}
   Users can submit responses

└─────────────────────────────────────────────────────────────────┘
```

### 📨 Form Submission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│           FORM SUBMISSION WORKFLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. USER ACCESSES PUBLISHED FORM
   Browser: GET /f/{share_token}
   ↓
2. FRONTEND FETCHES FORM STRUCTURE
   API: GET /runtime/forms/{formId}
   Returns: FormVersion with fields + rules
   ↓
3. FRONTEND RENDERS FORM
   Component: <FormRenderer />
   - Renders fields based on FormVersion
   - Applies default rules
   - Initializes validation
   ↓
4. USER FILLS FORM
   Frontend:
   - Real-time validation (client-side)
   - Rule evaluation (show/hide fields)
   - Calculated field updates
   ↓
5. USER SUBMITS FORM
   Frontend: POST /runtime/submit
   Request Body:
   {
     formId: Long,
     formVersionId: Long,
     fieldValues: {
       field_name_1: "value1",
       field_name_2: 42,
       ...
     },
     submittedByUserId?: Long,  // null if anonymous
   }
   ↓
6. BACKEND RECEIVES SUBMISSION
   RuntimeController.submitForm()
   FormSubmissionService.processSubmission()

   a) Load FormVersion (get table name, rules, fields)
   b) Validate received data:
      - All required fields present?
      - Data types correct?
      - File uploads scanned?

   c) Re-evaluate rules on backend (security):
      - AST-based evaluator
      - Hidden fields set to null
      - Calculated fields computed

   d) Sanitize input:
      - Escape strings
      - Type-cast values

   e) Get dynamic table name: "sub_form_1_v2"
   f) Build INSERT statement (parameterized):

      INSERT INTO "sub_form_1_v2"
      (field_name_1, field_name_2, submitted_at, created_by_id)
      VALUES (?, ?, NOW(), ?)

   g) Execute INSERT via JdbcTemplate
   h) Create FormSubmissionMeta record
      (tracks submission metadata)

   → Emit AuditLog event
   → Return SubmissionResponseDTO
   ↓
7. FRONTEND RECEIVES CONFIRMATION
   Display success toast
   Redirect to thank you page

8. DATA PERSISTED IN PostgreSQL
   Row inserted into sub_form_1_v2
   FormSubmissionMeta created
   Audit trail created

└─────────────────────────────────────────────────────────────────┘
```

### 🔀 Draft Submission (Unsaved Changes)

```
┌─────────────────────────────────────────────────────────────────┐
│           DRAFT SAVING WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────┘

1. FORM FORM IS IN BUILDER (DRAFT MODE)
2. USER MAKES CHANGES
   Frontend: useFormStore updates
   - Field added/removed
   - Properties changed
   - Rules modified
   ↓
3. AUTO-SAVE TRIGGERED (Every 30 seconds)
   Frontend: PUT /forms/:id
   Request Body:
   {
     title, description,
     fields: [...],
     rules: [...]
   }
   ↓
4. BACKEND SAVES DRAFT
   FormService.updateForm()
   - Updates Form entity
   - Updates FormField records
   - Preserves FormStatus as DRAFT
   ↓
5. NO DATABASE TABLE CREATED
   Draft submissions don't trigger table creation
   - No FormVersion created yet
   - Only occurs on publish

└─────────────────────────────────────────────────────────────────┘
```

---

## SECURITY IMPLEMENTATION

### 🔐 Authentication (Session-Based)

**Mechanism:**
- Spring Security with `HttpSession`
- `BCryptPasswordEncoder` for password hashing
- Custom `DaoAuthenticationProvider`
- Session timeout: 15 minutes (configurable)

**Flow:**
```
1. User login: POST /auth/login { username, password }
   ↓
2. AuthController validates credentials
   CustomUserDetailsService.loadUserByUsername()
   ↓
3. BCrypt password verification
   ↓
4. If valid:
   - Spring creates JSESSIONID cookie
   - Session stored in-memory (or DB)
   ↓
5. Subsequent requests include JSESSIONID
6. SecurityContext automatically populated
7. User accessible via SecurityContextHolder
```

**Concurrency Control:**
- `maximumSessions(1)` enforced in `SecurityConfig`
- User logged in on Device A
- Logs into Device B
- Device A session automatically invalidated
- User cannot have multiple concurrent sessions

### 🛡️ Authorization (RBAC)

**Role Hierarchy:**
```
SystemAdmin
├─ ROLE_ADMIN
│   └─ Full system access
├─ ROLE_MENTOR
│   └─ Can create/publish forms, approve
└─ ROLE_INTERN
    └─ Submit forms only
```

**Endpoint Protection:**
```java
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> deleteUser(@PathVariable Long id) { ... }

@PreAuthorize("hasAnyRole('ADMIN', 'MENTOR')")
public ResponseEntity<?> publishForm(@PathVariable Long id) { ... }

@PreAuthorize("isAuthenticated()")
public ResponseEntity<?> submitForm(@RequestBody SubmissionDTO dto) { ... }
```

**Module Permissions:**
- Roles assigned to Modules
- Each module has specific permissions
- User accesses only assigned modules

### 🚨 SQL Injection Prevention

**Approach 1: Parameterized SQL (Prepared Statements)**
```java
String sql = "INSERT INTO \"sub_form_1_v2\" (field_1, field_2) VALUES (?, ?)";
JdbcTemplate.update(sql, value1, value2);  // Safe - values bound separately
```

**Approach 2: Double-Quoted Identifiers**
```java
String tableName = "\"sub_form_1_v2\"";  // PostgreSQL validates table existence
String sql = "INSERT INTO " + tableName + " (col) VALUES (?)";
```

**Approach 3: Input Validation**
```java
// Column names validated against database schema
FormField field = formFieldRepository.findById(fieldId);
String columnName = field.getColumnName();  // Already validated
```

### 🔒 CSRF Protection

**Status:** Disabled (SameSite=Lax cookies assumed)

**Reasoning:**
- API is stateless (except session cookie)
- Frontend and backend on same origin (dev)
- SameSite=Lax prevents cross-site cookie inclusion
- Could be re-enabled for production

### 🔑 Mass Assignment Prevention

**Approach:** Specific DTOs prevent overwriting sensitive fields

```java
// BAD: Would allow user to set admin=true
@PostMapping
public Form create(@RequestBody Form form) { ... }

// GOOD: Only allowed fields mapped
@PostMapping
public Form create(@RequestBody CreateFormRequestDTO dto) {
  Form form = new Form();
  form.setTitle(dto.getTitle());
  form.setDescription(dto.getDescription());
  // id, createdBy, createdAt NOT set from DTO
  return formRepository.save(form);
}
```

### 🛡️ Validation & Sanitization

**Server-Side Validation:**
```java
@Valid
@PostMapping
public ResponseEntity<?> create(@Valid @RequestBody CreateFormRequestDTO dto) {
  // @Valid triggers constraint validation
  // JSR-303 annotations check size, pattern, etc.
}

@NotBlank(message = "Title required")
@Size(min = 3, max = 200)
private String title;
```

**Input Sanitization:**
```java
String sanitized = input.replaceAll("[<>\"'%;()&+]", "");  // Strip dangerous chars
```

### 📊 Schema Validation (Drift Detection)

**Mechanism:**
- `spring.jpa.hibernate.ddl-auto=validate` enforces strict validation
- Hibernate compares entity definitions with database schema
- Fails to start if mismatch detected
- Prevents runtime schema errors

**Benefit:** Early detection of schema evolution issues

### 🔓 Public Form Access

**Security:**
- Share token is UUID (not sequential ID)
- Prevents ID enumeration attacks
- Backend validates token exists before allowing submission
- Anonymous submissions recorded with null user_id

### 🔔 Rate Limiting (Recommended)

**Current Status:** Not implemented

**Recommendation:** Add to `WebConfig` or use API Gateway middleware
```
POST /runtime/submit → Max 10 submissions per IP per minute
POST /auth/login → Max 5 attempts per IP per minute
```

### 🔐 Secrets Management

**Current Status:** Hardcoded in `application.properties`

**Recommendation for Production:**
- Use environment variables
- Implement Spring Cloud Config Server
- Use AWS Secrets Manager / Azure Key Vault
- Never commit credentials to Git

```properties
spring.datasource.password=${DB_PASSWORD}
spring.datasource.username=${DB_USERNAME}
```

---

## CONFIGURATION & SETUP

### 🚀 Prerequisites

**Backend:**
- Java 21+
- Maven 3.8+
- PostgreSQL 14+

**Frontend:**
- Node.js 18+
- npm or yarn

### 🔧 Database Setup

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE formbuilder2;"

# 2. Optional: Create user with specific role
psql -U postgres -c "CREATE ROLE formbuilder WITH LOGIN PASSWORD 'password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE formbuilder2 TO formbuilder;"

# 3. Apply schema (auto-created on first backend startup)
# - Hibernate @Entity classes define schema
# - ddl-auto=validate ensures it exists
```

### 🏃 Quick Start

**Backend:**
```bash
cd formbuilder-backend1

# Build
mvn clean install

# Run
mvn spring-boot:run
# Starts on http://localhost:8080
# Swagger API docs: http://localhost:8080/swagger-ui.html
```

**Frontend:**
```bash
cd formbuilder-frontend1

# Install dependencies
npm install

# Run development server
npm run dev
# Starts on http://localhost:3000
```

### 🔗 API Base URL Configuration

**Frontend (services/api.ts):**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',  // Include session cookies
    ...options,
  });
  // ... error handling
};
```

### 📝 Environment Variables

**.env.local (Frontend):**
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_NAME=FormBuilder3
```

**application.properties (Backend):**
```
spring.datasource.url=jdbc:postgresql://localhost:5432/formbuilder2
spring.datasource.username=postgres
spring.datasource.password=root
```

### ✅ Verification Checklist

- [ ] PostgreSQL running on port 5432
- [ ] Database `formbuilder2` created
- [ ] Backend started (port 8080)
- [ ] Frontend started (port 3000)
- [ ] Can access http://localhost:3000
- [ ] Can login with test credentials
- [ ] Can create form in builder
- [ ] Can publish form
- [ ] Can submit form via public link
- [ ] Check audit logs in admin

---

## RECENT CHANGES & CURRENT STATUS

### 📝 Latest Commits

| Commit | Date | Description |
|--------|------|-------------|
| `893a8b8` | Mar 27 | docs added |
| `ead5f19` | Mar 27 | feat: implement SRS guardrails, bulk status updates, unsaved changes protection |
| `f1ee71a` | Mar 25 | feat: implement session concurrency enforcement |
| `ed4a7ab` | Mar 24 | feat: upgrade to Java 21, resolve publishing bugs, descriptive error toasts |
| `e8e8b70` | Mar 23 | UI improvements and error notifications |

### 🔄 Current Modified Files

The following files have uncommitted changes:

1. **formbuilder-backend1/src/main/java/.../controller/FormController.java**
   - Recent form endpoint modifications

2. **formbuilder-backend1/src/main/java/.../repository/FormRepository.java**
   - Query method additions

3. **formbuilder-backend1/src/main/java/.../repository/FormSubmissionMetaRepository.java**
   - Submission query optimization

4. **formbuilder-backend1/src/main/java/.../service/FormService.java**
   - Business logic updates

5. **formbuilder-frontend1/src/app/page.tsx**
   - Dashboard component changes

6. **formbuilder-frontend1/src/services/api.ts**
   - API client modifications

7. **formbuilder-backend1/src/main/java/.../dto/response/DashboardStatsResponseDTO.java** (NEW)
   - New DTO for dashboard statistics

### 🎯 Current Focus Areas

1. **SRS Guardrails** - Enforcing system resource limits
2. **Session Concurrency** - Max 1 session per user
3. **Unsaved Changes Protection** - Warning before navigation
4. **Java 21 Upgrade** - Modern JVM features
5. **Error Handling** - User-friendly error messages
6. **Dashboard Statistics** - System metrics

### ⚙️ Known Configuration

**App Limits (SRS Section 10):**
- Max fields per form: 50
- Max validations per form: 100
- Max pages per form: 10
- Max payload size: 100 KB
- Max file size: 5 MB
- Max request size: 10 MB

**Session Configuration:**
- Timeout: 15 minutes
- Max concurrent sessions: 1 per user
- Cookie name: JSESSIONID

---

## 📚 Additional Reference Files

For deeper technical details, refer to:

1. **ARCHITECTURE.md** - System design patterns, data flows, security architecture
2. **DOCUMENTATION.md** - Full API endpoint reference with request/response examples
3. **IMPLEMENTATION_GUIDE.md** - Setup, deployment, and troubleshooting
4. **SECURITY_AUDIT.md** - Security analysis and hardening recommendations
5. **feature_list.md** - Complete feature checklist

---

## 🤖 For AI Analysis: Key Patterns & Conventions

### Code Patterns to Know

1. **DTO Pattern**: Always use DTOs for REST endpoints (request/response)
2. **Service Layer**: Business logic in service classes, not controllers
3. **Repository Pattern**: Data access through JPA repositories
4. **Naming Convention**: CamelCase (Java), kebab-case (SQL), snake_case (database)
5. **Error Handling**: Custom exceptions + appropriate HTTP status codes

### Testing Strategy
- **Backend**: JUnit 5 + Mockito (tests in `src/test/java`)
- **Frontend**: Jest + React Testing Library (if configured)
- **Integration**: Manual API testing via Swagger

### Deployment Considerations
- Backend: Deployable JAR file
- Frontend: Static build artifacts (Next.js export)
- Database: Initialization scripts required before first run
- Reverse proxy: Needed to route `/api` to backend, `/` to frontend

---

**End of Instructions Manual**

Document prepared for comprehensive AI analysis and system understanding.
For questions, refer to inline documentation in source code or reach out to the development team.
