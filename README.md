# 📝 FormBuilder3
### Enterprise-Grade Dynamic Form & Schema Management System

FormBuilder3 is a full-stack, metadata-driven platform for creating complex, versioned forms with physical PostgreSQL backing. It bridges the gap between flexible UI design and structured database storage.

**Status:** ✅ **Production-Ready** | **Version:** 1.0.0 | **Last Updated:** March 2026

---

## 🚀 Core Features

### Form Building & Management
- ✅ **30+ Field Types**: TEXT, NUMERIC, GRID, LOOKUP, CALCULATED, and more.
- ✅ **Drag-and-Drop Canvas**: Intuitive UI for form creation via `@dnd-kit`.
- ✅ **Dynamic Table Engine**: Automatically manages PostgreSQL submission tables on publication.
- ✅ **Full Versioning**: Immutable snapshots of form schemas for complete auditability.

### Logic & Intelligence
- ✅ **Rule Engine (IF→THEN)**: JSON-based conditional visibility and validation logic.
- ✅ **Calculated Fields**: Real-time server-side evaluation of math expressions.
- ✅ **Live Preview**: Instant feedback during the building process.

### Administrative & Security
- ✅ **Role-Based Access (RBAC)**: Granular permissions for Admin, Mentor, and Intern roles.
- ✅ **Audit Logging**: Full traceability of all schema changes and user actions.
- ✅ **Bulk Operations**: Efficiently manage large volumes of form submissions.

---

## ⚡ Performance Optimization
- **Smart Polling**: Consolidates background requests into a single global state.
- **Tab-Visibility Aware**: Automatically pauses background API requests when the browser tab is inactive, drastically reducing server load and DB queries.

---

## 🛡️ Security Posture
FormBuilder3 implements multi-layer security controls:

| Layer | Status | Implementation |
|-------|--------|----------------|
| **Auth** | ✅ | Session-based (JSESSIONID) with `maximumSessions(1)`. |
| **Data** | ✅ | Parameterized SQL + Double-quoted identifiers for dynamic tables. |
| **Logic** | ✅ | Server-side AST validation for all rules and expressions. |
| **Privacy**| ✅ | UUID-based share tokens to prevent ID enumeration attacks. |

*For production hardening recommendations (Rate Limiting, Secrets Vault), see [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).*

---

## 📊 Project Statistics
| Metric | Value |
|--------|-------|
| **Backend Classes** | 100+ (Spring Boot 3.5.11, Java 21) |
| **Frontend Components** | 20+ (Next.js 16.1.6, React 19) |
| **API Endpoints** | 50+ RESTful Endpoints |
| **Database Entities** | 16 Core JPA entities |

---

## 📁 Project Structure
```text
FormBuilder3/
├── formbuilder-backend1/      # Spring Boot 3.5 (Logic & Dynamic JDBC)
│   ├── src/main/java/         # Controllers, Services, Entities, DTOs
│   ├── src/main/resources/    # application.properties, schema.sql
│   └── pom.xml                # Backend dependencies
├── formbuilder-frontend1/     # Next.js 16 (React 19 & Zustand)
│   ├── src/app/              # App Router Pages (Builder, Forms, Admin)
│   ├── src/components/       # UI & Builder Components
│   └── package.json           # Frontend dependencies
├── ARCHITECTURE.md            # System Design
├── DOCUMENTATION.md           # API Reference
├── IMPLEMENTATION_GUIDE.md    # Setup & Deployment
├── SECURITY_AUDIT.md          # Security Analysis
└── README.md                  # This file
```

---

## 📖 Documentation Suite
For detailed technical deep-dives, refer to:

- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System design and visual flow diagrams.
- 📖 **[DOCUMENTATION.md](./DOCUMENTATION.md)**: Full API Reference and Feature guide.
- 🚀 **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**: Setup, Deployment, and Troubleshooting.
- 🛡️ **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)**: Security Analysis and Hardening Checklist.

---

## 🔧 Quick Start
```bash
# 1. Setup DB
psql -U postgres -c "CREATE DATABASE formbuilder2;"

# 2. Start Backend
cd formbuilder-backend1 && mvn spring-boot:run

# 3. Start Frontend
cd formbuilder-frontend1 && npm install && npm run dev
```

---
© 2026 STTL. Enterprise Form & Schema Solutions.
