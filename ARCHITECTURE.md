# 🏗️ System Architecture - FormBuilder3

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Database Design](#database-design)
5. [Authentication Architecture](#authentication-architecture)
6. [API Architecture](#api-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [State Management Architecture](#state-management-architecture)
9. [Security Architecture](#security-architecture)

---

## 1. Architecture Overview
FormBuilder3 is an enterprise-grade, meta-data driven application that allows users to build complex forms with dynamic SQL backing.

### 🎯 System Design Philosophy
- **Dynamic Schema Execution**: Forms are not just JSON; they are backed by physical PostgreSQL tables created on-the-fly.
- **Versioned Snapshots**: Every "Publish" creates a permanent immutable schema version.
- **Logic-at-Both-Ends**: Rule evaluation happens in the browser for UX and on the server for integrity.

### 📊 High-Level Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Next.js 16+    │    │ Spring Boot 3.5 │    │  PostgreSQL 14+ │
│ (Form Builder)  │    │ (Business Logic)│    │ (Data Storage)  │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ Components│  │◄───┤  │ Controllers │  │◄───┤  │ Metadata  │  │
│  │  (React)  │  │    │  │ (REST)    │  │    │  │  Tables   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│                 │    │        │        │    │                 │
│  ┌───────────┐  │    │  ┌─────▼─────┐  │    │  ┌───────────┐  │
│  │ Zustand   │  │    │  │ Dynamic   │  │◄───┤  │ Submission│  │
│  │  Store    │  │    │  │ JDBC Svc  │  │    │  │  Tables   │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 2. Technology Stack
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | Next.js | 16.1.6 | Core Framework |
| **Styling** | Tailwind CSS | 4.2.1 | Utility-first CSS |
| **Backend** | Spring Boot | 3.5.11 | REST API & Security |
| **Language** | Java | 21 | Modern JVM |
| **Database** | PostgreSQL | 14+ | Relational & Dynamic Storage |
| **Security** | Spring Security | 6.4+ | Session-based Auth |
| **State** | Zustand | 5.0.11 | Minimalist State Management |
| **D&D** | @dnd-kit | 6.3.1 | Form Builder Canvas Drag-Drop |

---

## 3. Data Flow Architecture

### 🔄 Form Submission Flow
```
┌─────────────┐
│  Browser    │ 1. Validate (Frontend) -> 2. POST /submissions
└──────┬──────┘
       ▼
┌─────────────┐
│ API Gateway │ 3. Auth Check (Session Valid?)
└──────┬──────┘
       ▼
┌─────────────┐
│ Submission  │ 4. Recalculate Fields
│  Service    │ 5. Validate Rules (AST Evaluator)
└──────┬──────┘
       ▼
┌─────────────┐
│ Dynamic JDBC│ 6. Verify Table Exists
│   Service   │ 7. INSERT INTO sub_{id}_v{v}
└──────┬──────┘
       ▼
┌─────────────┐
│ PostgreSQL  │ 8. Commit Transaction
└─────────────┘
```

---

## 4. Database Design

### 🗄️ Core Entity Model
```
┌───────────────┐      ┌────────────────┐      ┌────────────────┐
│     FORMS     │      │ FORM_VERSIONS  │      │  FORM_FIELDS   │
├───────────────┤      ├────────────────┤      ├────────────────┤
│ id (PK)       │◄──┬──┤ id (PK)        │◄──┬──┤ id (PK)        │
│ title         │   └──┤ form_id (FK)   │   └──┤ version_id (FK)│
│ code (Unique) │      │ version_number │      │ column_name    │
│ share_token   │      │ rules (JSON)   │      │ field_type     │
└──────┬────────┘      └────────────────┘      │ validation_json│
       │                                       └────────────────┘
       ▼
┌────────────────────┐
│ DYNAMIC_TABLES     │ e.g. "sub_form_1_v2"
├────────────────────┤
│ submission_id (PK) │
│ column_1...n       │
│ submitted_at       │
└────────────────────┘
```

---

## 5. Authentication Architecture

### 🔐 Session-Based Auth (Stateful)
- **Engine**: Spring Security + HttpSession.
- **Provider**: `DaoAuthenticationProvider` with `BCryptPasswordEncoder`.
- **Concurrency**: `maximumSessions(1)` (User is logged out of other devices on new login).
- **CORS**: Credential sharing enabled for `localhost:3000`.

---

## 6. API Architecture
- **Base Path**: `/api/v1`
- **Modules**:
    - `/auth`: Login, Logout, Register, Me.
    - `/forms`: Builder CRUD, Versioning, Submissions.
    - `/runtime`: Public-facing submission & draft endpoints.
    - `/admin`: Role/User/Module management.

---

## 7. Frontend Architecture

### ⚛️ Directory Structure
```
src/
├── app/               # Next.js App Router (Layouts, Routes)
├── components/
│   ├── ui/            # Shadcn-inspired atomic components
│   └── builder/       # Canvas, Sidebar, Logic Panel, D&D
├── store/             # Zustand (useFormStore, useUIStore)
├── services/          # API Clients (Fetch wrapper)
└── types/             # Centralized TypeScript interfaces
```

---

## 8. State Management Architecture
**Zustand** is used for high-performance state:
- `useFormStore`: Current schema being edited, undo/redo history, field selection.
- `useUIStore`: Sidebar toggles, panel states, loading overlays.

---

## 9. Security Architecture
- **SQL Injection**: Prevented via parameterized `JdbcTemplate` for dynamic table operations.
- **CSRF**: Disabled (SameSite=Lax cookies relied upon for API isolation).
- **Mass Assignment**: Controlled via specific RequestDTOs for Form Creation.
- **Data Privacy**: UUID-based share tokens for public forms to prevent ID enumeration.

---
[DOCUMENTATION.md](./DOCUMENTATION.md) | [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
