# 📖 API Documentation & Features

**Base URL:** `http://localhost:8080/api/v1`

---

## ✨ Core Features at a Glance

| Feature | What It Does |
|---------|-------------|
| **Form Builder** | Drag-and-drop interface to create forms with 30+ field types |
| **Dynamic Tables** | When you publish a form, a PostgreSQL table is automatically created |
| **Versioning** | Every publish creates an immutable snapshot—old submissions stay with their original schema |
| **Rule Engine** | Add IF-THEN logic: "If age > 18, show voter ID field" |
| **Calculated Fields** | Automatically compute values: `price * quantity` |
| **Public Sharing** | Share forms with a unique link—no login required to submit |
| **Audit Trail** | Track all form changes, submissions, and user actions |
| **Role-Based Access** | Admin, Mentor, and Intern roles with specific permissions |

---

## 🔐 **Authentication**

### Login
```
POST /auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}

Response:
HTTP 200 OK
Set-Cookie: JSESSIONID=...
{
  "userId": 1,
  "username": "john",
  "roles": ["ADMIN"]
}
```

### Get Current User
```
GET /auth/me

Response:
{
  "id": 1,
  "username": "john",
  "email": "john@example.com",
  "roles": ["ADMIN"],
  "permissions": ["MANAGE_FORMS", "MANAGE_USERS"]
}
```

### Logout
```
POST /auth/logout

Response: HTTP 204 No Content
```

---

## 📝 **Form Management**

### List All Forms
```
GET /forms?status=PUBLISHED&page=0&size=10

Response:
{
  "content": [
    {
      "id": 1,
      "title": "Customer Feedback",
      "code": "feedback_form",
      "status": "PUBLISHED",
      "version": 2,
      "createdBy": "admin",
      "createdAt": "2026-03-20T10:00:00Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

### Create New Form
```
POST /forms
Content-Type: application/json

{
  "title": "Customer Feedback Form",
  "code": "feedback_form",
  "description": "Collect customer feedback"
}

Response: HTTP 201 Created
{
  "id": 1,
  "title": "Customer Feedback Form",
  "code": "feedback_form",
  "status": "DRAFT"
}
```

### Get Form Details (with Fields & Rules)
```
GET /forms/1

Response:
{
  "id": 1,
  "title": "Customer Feedback",
  "code": "feedback_form",
  "status": "PUBLISHED",
  "version": 2,
  "fields": [
    {
      "id": 101,
      "columnName": "customer_name",
      "label": "Your Name",
      "fieldType": "TEXT",
      "required": true,
      "validations": { "minLength": 2, "maxLength": 100 }
    }
  ],
  "rules": [
    {
      "id": 1,
      "name": "Show escalation section",
      "condition": { "field": "satisfaction", "operator": "equals", "value": "low" },
      "actions": [{ "type": "show", "targetField": "escalation_reason" }]
    }
  ]
}
```

### Update Form (while in DRAFT)
```
PUT /forms/1
Content-Type: application/json

{
  "title": "Updated Title",
  "fields": [ ... ],
  "rules": [ ... ]
}

Response: HTTP 200 OK
```

### Publish Form (Create Version & Database Table)
```
POST /forms/1/publish

Response: HTTP 200 OK
{
  "id": 1,
  "status": "PUBLISHED",
  "version": 2,
  "publishedAt": "2026-03-20T10:00:00Z",
  "shareToken": "abc123def456"
}
```

**What happens:**
- Form status → PUBLISHED
- New FormVersion created (version 2)
- PostgreSQL table created: `sub_form_1_v2`
- Public link generated: `/f/abc123def456`

### Delete Form
```
DELETE /forms/1

Response: HTTP 204 No Content
```

---

## 📥 **Form Submissions**

### Submit Form Response (Public - No Auth Required)
```
POST /runtime/submit
Content-Type: application/json

{
  "formId": 1,
  "formVersionId": 1,
  "fieldValues": {
    "customer_name": "John Doe",
    "email": "john@example.com",
    "satisfaction": "high",
    "comments": "Great service!"
  },
  "submittedBy": null  // null for anonymous submissions
}

Response: HTTP 201 Created
{
  "submissionId": 501,
  "formId": 1,
  "submittedAt": "2026-03-20T10:00:00Z",
  "message": "Form submitted successfully"
}
```

### Get All Submissions for a Form (Auth Required)
```
GET /forms/1/submissions?page=0&size=20

Response:
{
  "content": [
    {
      "id": 501,
      "fieldValues": {
        "customer_name": "John Doe",
        "email": "john@example.com",
        "satisfaction": "high"
      },
      "submittedAt": "2026-03-20T10:00:00Z",
      "submittedBy": "john"
    }
  ],
  "totalElements": 45,
  "totalPages": 3
}
```

### Get Single Submission
```
GET /runtime/submissions/501

Response:
{
  "id": 501,
  "formId": 1,
  "fieldValues": { ... },
  "submittedAt": "2026-03-20T10:00:00Z"
}
```

---

## 👥 **User Management** (Admin Only)

### List Users
```
GET /admin/users

Response:
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["ADMIN"],
    "createdAt": "2026-03-01T00:00:00Z"
  }
]
```

### Create User
```
POST /admin/users
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePass123",
  "roles": ["INTERN"]
}

Response: HTTP 201 Created
{ "id": 5, "username": "newuser", ... }
```

### Assign Role to User
```
POST /admin/users/5/roles
Content-Type: application/json

{
  "roleId": 2  // MENTOR role
}

Response: HTTP 204 No Content
```

---

## 🔑 **Roles & Permissions**

### Available Roles

| Role | Can Do |
|------|--------|
| **ADMIN** | Everything—create users, manage roles, delete forms, view all data |
| **MENTOR** | Create/publish forms, view all responses, export data |
| **INTERN** | Submit forms, view own submissions, edit own profile |

### Assign Module to Role
```
POST /admin/role-modules
Content-Type: application/json

{
  "roleId": 2,           // MENTOR
  "moduleId": 1          // Forms Builder module
}

Response: HTTP 201 Created
```

---

## 📊 **Admin & Audit**

### Get Dashboard Stats
```
GET /admin/dashboard

Response:
{
  "totalForms": 15,
  "publishedForms": 12,
  "totalSubmissions": 1245,
  "activeUsers": 8,
  "lastPublish": "2026-03-20T10:00:00Z"
}
```

### View Audit Logs
```
GET /admin/audit?page=0&size=50

Response:
[
  {
    "id": 1001,
    "userId": 1,
    "action": "PUBLISHED_FORM",
    "entityType": "Form",
    "entityId": 1,
    "changes": {
      "before": { "status": "DRAFT" },
      "after": { "status": "PUBLISHED" }
    },
    "createdAt": "2026-03-20T10:00:00Z"
  }
]
```

---

## 🔄 **Error Responses**

All errors follow this format:

```json
{
  "error": "Bad Request",
  "message": "Field 'title' is required",
  "status": 400,
  "timestamp": "2026-03-20T10:00:00Z"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 404 | Not found |
| 409 | Conflict (e.g., form code already exists) |
| 500 | Server error |

---

## 📋 **Field Types**

Create forms with these field types:

```
TEXT           Single-line text
NUMERIC        Numbers (int, decimal)
EMAIL          Email with built-in validation
PHONE          Phone number
DATE           Date picker
DATETIME       Date & time picker
TIME           Time only
TEXTAREA       Multi-line text
CHECKBOX       Yes/no toggle
RADIO          Multiple choice (pick one)
SELECT         Dropdown menu
MULTI_SELECT   Dropdown (pick multiple)
CURRENCY       Number formatted as currency
PERCENTAGE     Number 0-100%
SLIDER         Range picker
GRID           Table of fields
LOOKUP         Search existing data
CALCULATED     Auto-computed value
FILE           File upload
IMAGE          Image upload with preview
RICH_TEXT      Text editor with formatting
HIDDEN         Not shown to user
PAGE_BREAK     Multi-page forms
SECTION_HEADER Heading/section divider
```

---

## 🎯 **Quick Examples**

### Example 1: Create a Simple Feedback Form
```bash
# 1. Create form
curl -X POST http://localhost:8080/api/v1/forms \
  -H "Content-Type: application/json" \
  -d '{"title":"Feedback","code":"feedback"}'

# Returns: { "id": 1, "status": "DRAFT" }

# 2. Add fields via PUT /forms/1
# 3. Publish form
curl -X POST http://localhost:8080/api/v1/forms/1/publish

# 4. Get public link
# /f/{shareToken}
```

### Example 2: Submit Response via Public Link
```bash
curl -X POST http://localhost:8080/api/v1/runtime/submit \
  -H "Content-Type: application/json" \
  -d '{
    "formId": 1,
    "fieldValues": {
      "name": "Customer",
      "rating": 5,
      "comment": "Excellent!"
    }
  }'
```

---

→ [See ARCHITECTURE.md](./ARCHITECTURE.md) for how it works
→ [See IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) to set it up
