# 📋 FormBuilder3

**Enterprise-grade dynamic form builder with PostgreSQL backing.**

Create complex forms with a drag-and-drop interface. When you publish, a real database table is automatically created to store responses.

---

## ⚡ Quick Start

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE formbuilder2;"

# 2. Start backend
cd formbuilder-backend1
mvn spring-boot:run

# 3. Start frontend (new terminal)
cd formbuilder-frontend1
npm install && npm run dev

# 4. Open browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:8080/swagger-ui.html
```

**Done in 5 minutes!** → [Detailed setup guide](./IMPLEMENTATION_GUIDE.md)

---

## ✨ Key Features

- **🎨 Visual Builder:** Drag-and-drop canvas with 30+ field types
- **📊 Dynamic Tables:** Automatic PostgreSQL table creation on publish
- **🎯 Rule Engine:** IF-THEN conditional logic for fields
- **📝 Form Versioning:** Immutable snapshots—old submissions stay with their schema
- **🔐 Security:** Role-based access, session management, SQL injection prevention
- **📤 Public Sharing:** Share forms with unique links—no login required
- **📋 Audit Trail:** Track all changes and submissions
- **💡 Real-time Preview:** See changes instantly in builder
- **📝 Status Model:** Clear distinction between `DRAFT` forms and `RESPONSE_DRAFT` submissions

---

## 🏛️ Status Nomenclature
> [!NOTE]
> To ensure clarity in operational data, the system distinguishes between form states and submission states:
> - **Form `DRAFT`**: A form being built but not yet published.
> - **Submission `RESPONSE_DRAFT`**: A user's work-in-progress response (saved progress).
> - **Submission `SUBMITTED`**: A finalized and locked user response.

---

## 🏗️ Architecture

```
Frontend (Next.js)         Backend (Spring Boot)       Database (PostgreSQL)
─────────────────          ──────────────────         ─────────────────────
Form Builder UI      →     REST API & Services   →    Metadata Tables
Drag-Drop Canvas     →     Rule Engine           →    Dynamic Submission Tables
Zustand State Store  ←     Validation Logic      ←    (sub_form_X_vY)
```

**Key Principle:** Forms are versioned snapshots. Every publish creates an actual database table.

→ [See full architecture diagram](./ARCHITECTURE.md)

---

## 📚 Documentation

| Document | Read Time | For |
|----------|-----------|-----|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | 15 min | Understanding system design |
| [**DOCUMENTATION.md**](./DOCUMENTATION.md) | 20 min | API reference & features |
| [**IMPLEMENTATION_GUIDE.md**](./IMPLEMENTATION_GUIDE.md) | 10 min | Setup & deployment |
| [**SECURITY_AUDIT.md**](./SECURITY_AUDIT.md) | 15 min | Security & hardening |
| [**DOCUMENTATION_GUIDE.md**](./DOCUMENTATION_GUIDE.md) | 5 min | Which doc to read? |

**First time?** → Start with [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

---

## 🛠️ Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js + React | 16.1.6 + 19.2 |
| **Backend** | Spring Boot + Java | 3.5.11 + 21 |
| **Database** | PostgreSQL | 14+ |
| **State** | Zustand | 5.0.11 |
| **Styling** | Tailwind CSS | 4.2.1 |

---

## 📈 Project Stats

- **100+** Backend classes
- **20+** Frontend components
- **50+** API endpoints
- **16** Database entities
- **30+** Field types supported

---

## 🚀 Use Case Example

**Build a Customer Feedback Form**

```
1. Click "Create Form"
2. Add fields: Name, Email, Rating, Comments
3. Add rule: "If rating < 3, show escalation field"
4. Click "Publish"
5. Share public link → /f/{token}
6. Customers fill form
7. Database automatically stores responses
8. View responses in admin panel
```

Done! Form collects data, validates input, and stores in PostgreSQL. No custom backend needed.

---

## 🔐 Security

- ✅ Session-based authentication (JSESSIONID)
- ✅ Password hashing with BCrypt
- ✅ SQL injection prevention (parameterized queries)
- ✅ Role-based access control
- ✅ Server-side rule validation
- ⚠️ See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for production hardening

---

## 🎓 How It Works

### Form Publication Flow
```
Draft Form
    ↓ (click "Publish")
Validate schema
    ↓
Create database table (sub_form_X_vY)
    ↓
Form published & added to public link
    ↓
Ready for submissions
```

### Submission Flow
```
User fills form
    ↓
Frontend validates
    ↓ (submit)
Backend validates + re-evaluates rules
    ↓
INSERT into database table
    ↓
Response stored with exact schema version
```

→ [See detailed flows](./ARCHITECTURE.md#-how-it-works-form-publication)

---

## 📋 System Model

```
FORMS (form metadata)
  ├─ FORM_VERSIONS (versioned snapshots)
  │  ├─ FORM_FIELDS (field definitions)
  │  └─ Rules (JSON)
  └─ Dynamic Tables (sub_form_1_v1, sub_form_1_v2, etc.)

DATA (submissions)
  └─ Dynamic submission tables created on publish
```

---

## 🔗 API Example

### Create & Publish Form
```bash
# Create
curl -X POST http://localhost:8080/api/v1/forms \
  -H "Content-Type: application/json" \
  -d '{"title":"Feedback","code":"feedback_form"}'

# Publish
curl -X POST http://localhost:8080/api/v1/forms/1/publish

# Get public link
# /f/{shareToken}
```

### Submit Response
```bash
curl -X POST http://localhost:8080/api/v1/runtime/submit \
  -H "Content-Type: application/json" \
  -d '{
    "formId": 1,
    "fieldValues": {
      "name": "John",
      "rating": 5,
      "comment": "Great service!"
    }
  }'
```

→ [See all API endpoints](./DOCUMENTATION.md)

---

## 🚀 Deployment

### Development
```bash
mvn spring-boot:run        # Backend on :8080
npm run dev                # Frontend on :3000
```

### Production
```bash
# Build backend
mvn clean package
java -jar target/formbuilder2-0.0.1-SNAPSHOT.jar

# Build frontend
npm run build
npm start
```

→ [Detailed deployment guide](./IMPLEMENTATION_GUIDE.md#-deployment-production)

---

## ❓ FAQ

**Q: Can I change the database?**
A: PostgreSQL is strongly recommended. The codebase uses PostgreSQL-specific features.

**Q: How do I backup my data?**
A: Use PostgreSQL backup: `pg_dump -U postgres formbuilder2 > backup.sql`

**Q: Can users modify published forms?**
A: No, published forms are immutable. Create a new version to make changes.

**Q: Is it scalable?**
A: Yes. Backend is stateless and can be horizontally scaled. Ensure PostgreSQL can handle your load.

**Q: How many fields per form?**
A: Max 50 fields per form (configurable in `application.properties`).

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Ensure PostgreSQL is running and database exists |
| Can't connect frontend to backend | Check API URL in `src/services/api.ts` |
| Form won't publish | Check all fields have valid types and names |
| Database shows error on startup | Run: `psql -U postgres -c "CREATE DATABASE formbuilder2;"` |

→ [Full troubleshooting guide](./IMPLEMENTATION_GUIDE.md#-troubleshooting)

---

## 📞 Getting Help

1. Check [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) to find the right document
2. Search the relevant document with Ctrl+F
3. Check [IMPLEMENTATION_GUIDE.md troubleshooting](./IMPLEMENTATION_GUIDE.md#-troubleshooting)
4. Review [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) if security-related

---

## 📅 Version Info

- **Version:** 1.0.0
- **Status:** Production-Ready
- **Last Updated:** March 27, 2026
- **Java:** 21
- **Next.js:** 16.1.6
- **PostgreSQL:** 14+

---

## 📖 Next Steps

1. **Try it locally:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
2. **Understand architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Learn the API:** [DOCUMENTATION.md](./DOCUMENTATION.md)
4. **Prepare for production:** [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

---

**By STTL for enterprise form management.**
