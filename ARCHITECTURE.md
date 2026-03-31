# 🏗️ System Architecture

How FormBuilder3 works and why it's designed this way.

---

## 📊 System Overview

FormBuilder3 is a **dynamic form builder** where forms are backed by real PostgreSQL tables. When you publish a form, the system creates an actual database table to store responses—not just JSON.

```
User Interface (Next.js)    Business Logic (Spring Boot)    Database (PostgreSQL)
────────────────────────    ─────────────────────────      ──────────────────────

  Form Builder          →       Controllers           →      Metadata Tables
  Canvas UI             →       Services              →      Form Schema
  Real-time Preview     ←       Rule Engine           ←      Submissions
  + Zustand State       →       Validation            →      (sub_form_X_vY)
```

**Key Principle:** Forms are versioned snapshots. Every publish creates an immutable database table, so submissions are always tied to the exact schema they were entered with.

---

## 🔄 How It Works: Form Publication

```
Step 1: User creates form in builder (DRAFT)
        ↓
Step 2: User clicks "Publish"
        ↓
Step 3: Backend validates:
        ├─ All fields have valid types
        ├─ Rules are syntactically correct
        └─ Table name doesn't conflict
        ↓
Step 4: Backend generates PostgreSQL table
        ├─ CREATE TABLE "sub_form_1_v2" (...)
        ├─ Each field → one column
        └─ Add default columns (submitted_at, created_by_id)
        ↓
Step 5: Form becomes PUBLISHED
        ├─ Public link generated: /f/{unique-token}
        ├─ Can now accept submissions
        └─ Previous version archived
```

---

## 📝 How It Works: Form Submission

```
User fills form online
        ↓
Frontend validates (quick feedback)
        ↓
User clicks Submit → POST /api/v1/runtime/submit
        ↓
Backend receives submission:
        ├─ Verify user has permission
        ├─ Re-validate all data (server-side)
        ├─ Re-evaluate rules (prevent tampering)
        ├─ Look up correct table (sub_form_1_v2)
        └─ Find database columns from FormVersion
        ↓
Backend executes SQL (parameterized, safe):
        INSERT INTO "sub_form_1_v2" (field_1, field_2, submitted_at)
        VALUES (?, ?, NOW())
        ↓
Data saved to PostgreSQL
Audit log created
Success message sent to frontend
```

---

## 🛠️ Technology Stack

| Layer | Technology | Why This Choice |
|-------|-----------|-----------------|
| **Frontend** | Next.js 16 + React 19 | Server components + type safety |
| **State** | Zustand | Lightweight, minimal boilerplate |
| **Drag-Drop** | @dnd-kit | Modern, headless D&D library |
| **Backend** | Spring Boot 3.5 | Enterprise standard, security built-in |
| **Language** | Java 21 | Modern records, pattern matching |
| **Database** | PostgreSQL 14+ | Strong JSON support, versioning |
| **Auth** | Spring Security | Industry standard, works with sessions |
| **Styling** | Tailwind CSS | Utility-first, fast development |

---

## 💾 Database Structure

### Core Tables

```
FORMS                          FORM_VERSIONS              FORM_FIELDS
├─ id                         ├─ id                      ├─ id
├─ title                      ├─ form_id → FORMS.id      ├─ version_id → FORM_VERSIONS.id
├─ code (unique)              ├─ version_number          ├─ column_name
├─ status                     ├─ rules (JSON)            ├─ field_type (TEXT, NUMERIC, etc.)
├─ share_token (UUID)         ├─ published_at            ├─ label
└─ created_by_id → USERS.id   └─ created_at              ├─ validation_json
                                                         └─ display_order
```

### Dynamic Submission Tables

When you publish a form (e.g., form ID=1, version=2), a table is created:

```
"sub_form_1_v2"
├─ submission_id (PK)         Auto-increment ID
├─ field_name_1 (VARCHAR)     From FORM_FIELDS
├─ field_name_2 (INTEGER)     From FORM_FIELDS
├─ submitted_at (TIMESTAMP)   When submitted
├─ created_by_id (INTEGER)    Who submitted (if logged in)
└─ ... (one column per form field)
```

**Why separate files:** Each version gets its own table. Old submissions stay intact when you update a form.

---

## 🔐 Authentication & Authorization

### Session-Based (Not Tokens)

```
User logs in
    ↓
Spring Security checks credentials (BCrypt)
    ↓
If valid: Create JSESSIONID cookie
    ↓
Frontend includes cookie with every request
    ↓
Backend verifies session is valid
    ↓
Proceed with request
```

**Key Features:**
- **One session per user:** If user logs in on Device A, then Device B, Device A is logged out
- **15-minute timeout:** Idle sessions expire automatically
- **Secure cookies:** HttpOnly, SameSite=Lax (production: Secure flag enabled)

### Role-Based Access Control (RBAC)

```
Users
  ↓ (assigned to)
Roles
  ├─ ADMIN: Full system access
  ├─ MENTOR: Can create/publish forms, view all responses
  └─ INTERN: Can submit forms, view own responses
  ↓ (has permissions to)
Modules (features)
  ├─ Forms Builder
  ├─ Form Responses
  ├─ Admin Panel
  └─ Audit Logs
```

---

## 🎨 Frontend Structure

```
app/
├─ page.tsx                    Home/Dashboard
├─ login/page.tsx              Login page
├─ profile/page.tsx            User profile
│
├─ builder/
│  ├─ page.tsx                 Form builder (drag-drop)
│  └─ preview/page.tsx         Form preview
│
├─ forms/[id]/
│  └─ responses/page.tsx        View form responses
│
├─ f/[token]/page.tsx           Public form submission (no auth)
│
└─ admin/
   ├─ users/page.tsx            User management
   ├─ roles/page.tsx            Role management
   └─ audit/page.tsx            Audit logs

components/
├─ builder/
│  ├─ Canvas.tsx               Main editing area (drag-drop)
│  ├─ Sidebar.tsx              Available field types
│  ├─ PropertiesPanel.tsx       Field config/settings
│  ├─ LogicPanel.tsx            Rule builder (IF-THEN)
│  └─ VersionsPanel.tsx         Version history
│
└─ FormRenderer.tsx            Display form for submission

store/
├─ useFormStore.ts             Current form being edited
└─ useUIStore.ts               UI state (panel toggles, etc.)

services/
├─ api.ts                       API client wrapper
└─ ...                          Domain-specific services
```

---

## 🧠 Rule Engine

Forms can have conditional rules (IF-THEN logic):

```json
{
  "condition": {
    "field": "age",
    "operator": "greaterThan",
    "value": 18
  },
  "action": {
    "type": "show",
    "targetField": "voter_id_section"
  }
}
```

**Evaluated twice:**
1. **Client-side (Frontend):** For instant UI feedback as user types
2. **Server-side (Backend):** For data integrity (prevent cheating)

**Supported operators:** `equals`, `notEquals`, `greaterThan`, `lessThan`, `contains`, `startsWith`, `endsWith`

**Supported actions:** `show`, `hide`, `enable`, `disable`, `require`, `clearValue`

---

## 🔒 Security Hardening

| Threat | Solution |
|--------|----------|
| **SQL Injection** | Parameterized queries (? placeholders), validated column names |
| **Session Hijacking** | HTTPOnly cookies, SameSite policy, HTTPS in production |
| **Brute Force Login** | Account lockout after 5 failed attempts (recommended) |
| **Data Tampering** | Server-side re-validation of all rules & data types |
| **Form Enumeration** | UUID-based share tokens (not sequential IDs) |
| **CSRF** | SameSite=Strict cookies, session-based (not stateless) |

---

## 📡 API Routes

```
/api/v1
├─ auth/
│  ├─ POST /login
│  ├─ POST /logout
│  └─ GET /me
│
├─ forms/
│  ├─ GET /          (list forms)
│  ├─ POST /         (create form)
│  ├─ GET /:id       (form detail)
│  ├─ PUT /:id       (update form)
│  └─ POST /:id/publish    (publish version)
│
├─ runtime/          (for form submissions)
│  ├─ POST /submit   (submit form response)
│  └─ GET /drafts/:id
│
└─ admin/            (requires ADMIN role)
   ├─ users/
   ├─ roles/
   └─ modules/
```

---

## 🎯 Next Steps

→ [See DOCUMENTATION.md](./DOCUMENTATION.md) for API reference
→ [See IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) to set it up
→ [See SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for hardening checklist
