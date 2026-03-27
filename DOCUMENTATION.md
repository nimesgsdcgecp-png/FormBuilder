# 📖 Project Documentation - FormBuilder3

## 🎯 Core Features
- **Visual Form Builder**: Drag-and-drop canvas for 30+ field types (Text, Number, Grid, Lookups).
- **Dynamic Table Engine**: Automatically creates/alters PostgreSQL tables on form publication.
- **Rule & Calculation Engine**: JSON-based logic for field visibility and calculated values (`price * qty`).
- **Form Versioning**: Snapshot system ensuring submissions are tied to the exact schema at time of entry.
- **Audit Logging**: Full traceability of all schema changes and user actions.

---

## 👥 User Roles & Access
| Role | Primary Authority | Capability |
|------|-------------------|------------|
| **Admin** | `MANAGE`, `ROLE_ADMIN` | Full system control, User & Role management, Permanent deletions. |
| **Mentor** | `VIEW_ALL`, `ROLE_MENTOR` | View all responses, Export data, Manage assigned forms. |
| **Intern** | `ROLE_INTERN` | Create forms (Drafts), Submit responses, View own submissions. |

---

## 🔌 API Reference (Base: `/api/v1`)

### 🔐 Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Authenticate and start session | Public |
| POST | `/auth/logout` | Invalidate current session | User |
| GET | `/auth/me` | Get current user profile & permissions | User |

### 📝 Form Management
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/forms` | List all active forms | User |
| POST | `/forms` | Create a new form (Draft) | User |
| GET | `/forms/{id}` | Get full form schema & rules | User |
| PUT | `/forms/{id}` | Update form & sync DB table | User |
| DELETE | `/forms/{id}` | Archive form (Soft delete) | User |

### 📥 Submissions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/forms/{id}/submissions` | Paginated list of responses | Mentor+ |
| POST | `/forms/{id}/submissions` | Submit new response | Public/User |
| GET | `/runtime/forms/{code}` | Get form by custom code | Public |

### 🛠️ Admin Operations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | List all system users | Admin |
| POST | `/admin/roles` | Create/Manage custom roles | Admin |
| GET | `/modules` | List all functional modules | Admin |

---

## 🧠 Rule Engine Logic
Rules are stored as JSON and evaluated sequentially.
**Example Structure:**
```json
{
  "if": { "column": "age", "operator": "greaterThan", "value": 18 },
  "then": { "action": "show", "target": "voter_id_section" }
}
```
**Supported Operators**: `equals`, `notEquals`, `greaterThan`, `lessThan`, `contains`, `matches`.

---
[ARCHITECTURE.md](./ARCHITECTURE.md) | [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
