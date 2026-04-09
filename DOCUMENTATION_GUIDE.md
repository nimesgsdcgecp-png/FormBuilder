# 📚 Documentation Guide

**Last Updated:** April 2026  
**Status:** Complete - All features enabled & tested

Quick navigation for finding the right documentation based on your needs.

---

## 📑 Document Overview

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **ARCHITECTURE.md** | System design, technology stack, data flows | 20 min |
| **FORM_BUILDER_SPECIFICATION.md** | Feature specifications & requirements | 15 min |
| **SECURITY_AUDIT.md** | Security assessment & hardening guide | 15 min |
| **README.md** | Project overview & quick start | 5 min |

---

## 🎯 What Do You Want to Do?

### 🚀 **Get the System Running**
**Read:** [README.md](./README.md)
- Quick start guide
- Prerequisites (Node, Java, PostgreSQL)
- How to start backend and frontend
- Test with demo forms
- **Time:** 5-10 minutes

---

### 🏗️ **Understand the Architecture**
**Read:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- System overview & components
- How forms are created → published → submitted
- Database structure (metadata + dynamic tables)
- Workflow & Rule engines
- Technology stack & why each choice
- Data flow diagrams
- **Time:** 20 minutes
- **For:** Developers, system architects, DevOps

---

### 📋 **Learn Form Building Features**
**Read:** [FORM_BUILDER_SPECIFICATION.md](./FORM_BUILDER_SPECIFICATION.md)
- Complete feature list
- Form types & field types supported
- Validation rules
- Workflow/approval system
- Rule engine capabilities
- Public vs authenticated forms
- **Time:** 15 minutes
- **For:** Product managers, form builders, testers

---

### 🔒 **Prepare for Production / Security**
**Read:** [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)
- Current security status
- Identified risks (and how we fixed them)
- Production hardening checklist
- HTTPS configuration
- Database security settings
- Incident response procedures
- **Time:** 15 minutes
- **For:** Security team, DevOps, system admins

---

### 💻 **Integrate via API**
**Status:** API endpoints are centralized in ApiConstants
- **Backend:** `com.sttl.formbuilder2.util.ApiConstants.java`
- **Frontend:** `src/utils/apiConstants.ts`
- All 15 controllers use centralized constants
- Change `VERSION = "v1"` to `"v2"` updates all endpoints

**Example Endpoints:**
```
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/forms
GET    /api/v1/forms/{formId}
POST   /api/v1/workflows/initiate
GET    /api/v1/workflows/available-authorities
```

**For details:** Review the controllers in `formbuilder-backend1/src/main/java/com/sttl/formbuilder2/controller/`

---

### 🧪 **Test the System**
**Basic Flow:**
1. Start backend: `./gradlew bootRun`
2. Start frontend: `npm run dev`
3. Navigate to `http://localhost:3000`
4. Login (default: admin/admin)
5. Create a form → Publish → Share link
6. Fill form via public link

**For workflow testing:**
1. Create a form
2. Publish it
3. Click "Initiate Workflow" button
4. Select an approver
5. Submit for approval
6. Log in as approver → Approve/Reject

---

### 🔧 **Fix Issues / Debug**
**Common Issues:**

| Problem | Solution |
|---------|----------|
| Auth returning only username | ✅ Fixed - now returns userId + roles array |
| Black borders everywhere | ✅ Fixed - CSS syntax corrected |
| Workflow modal not visible | ✅ Fixed - styled properly |
| Rule engine not showing | ✅ Fixed - uncommented tab |
| UUID type mismatch (409 error) | ✅ Fixed - validateFormCode excludes current form |

**For new issues:**
- Check backend logs: `target/app.log`
- Check frontend console: F12 → Console tab
- Search error code in SECURITY_AUDIT.md

---

## 📚 Document Structure

```
FormBuilder3/
├─ README.md                          ← START HERE
├─ ARCHITECTURE.md                    ← How it works (UPDATED)
├─ FORM_BUILDER_SPECIFICATION.md      ← What it does
├─ SECURITY_AUDIT.md                  ← Production safety (KEPT)
├─ DOCUMENTATION_GUIDE.md             ← You are here (UPDATED)
│
├─ formbuilder-backend1/
│  └─ src/main/java/com/.../
│     └─ util/ApiConstants.java       ← ALL endpoints defined
│
└─ formbuilder-frontend1/
   └─ src/utils/
      └─ apiConstants.ts              ← Frontend API constants
```

---

## 🚀 Feature Checklist

✅ **Basic Form Building**
- ✅ Create forms with drag-and-drop
- ✅ Add text, numeric, date, select fields
- ✅ Configure field validation
- ✅ Set theme colors & fonts
- ✅ Publish forms to PostgreSQL

✅ **Rule Engine**
- ✅ Visual rule builder (IF-THEN logic)
- ✅ Conditional show/hide fields
- ✅ Enable/disable fields based on values
- ✅ Cross-field validation
- ✅ Server-side rule evaluation

✅ **Workflow & Approval**
- ✅ Initiate workflows from builder
- ✅ Select approvers
- ✅ Multi-step approval chains
- ✅ Approve/reject with comments
- ✅ Audit trail for all decisions

✅ **Form Versioning**
- ✅ Create new form versions
- ✅ Activate/deactivate versions
- ✅ Submissions tied to exact version
- ✅ Schema changes don't break old submissions

✅ **User Management**
- ✅ User registration
- ✅ Role-based access control
- ✅ Session-based authentication
- ✅ Permission management

✅ **Data Management**
- ✅ View form responses
- ✅ Export to CSV
- ✅ Bulk delete/restore
- ✅ Soft deletes (recovery possible)
- ✅ Audit logs

✅ **API**
- ✅ 15 controllers (all using ApiConstants)
- ✅ Centralized path management
- ✅ Version constants for easy upgrades
- ✅ Consistent error handling
- ✅ Proper HTTP status codes

---

## 🛠️ Recent Updates (April 2026)

### Code Organization
- ✅ Created `ApiConstants.java` for backend paths
- ✅ Created `apiConstants.ts` for frontend paths
- ✅ Migrated all 13 backend controllers
- ✅ Single source of truth for API versioning

### Bug Fixes
- ✅ Auth login response now includes userId and roles
- ✅ Fixed CSS syntax errors (Tailwind)
- ✅ Fixed form code uniqueness validation
- ✅ Fixed UUID type handling

### Features Enabled
- ✅ Workflow engine fully operational
- ✅ Rule engine UI and logic complete
- ✅ All commented code uncommented
- ✅ All styling fixed

---

## 📞 Support

### Where to Find...

| Need | Look In |
|------|----------|
| **Setup instructions** | README.md |
| **How features work** | ARCHITECTURE.md |
| **What's supported** | FORM_BUILDER_SPECIFICATION.md |
| **Security info** | SECURITY_AUDIT.md |
| **API endpoints** | Backend controllers + ApiConstants.java |
| **Frontend API calls** | src/services/api.ts + apiConstants.ts |
| **Backend config** | application.properties |

### Documentation Files Removed

The following outdated/duplicate files have been removed for clarity:
- ❌ API_MIGRATION_COMPLETE.md (old status)
- ❌ API_MIGRATION_EXECUTIVE_SUMMARY.md (outdated)
- ❌ COMPLIANCE_AUDIT.md (superseded by SECURITY_AUDIT.md)
- ❌ CORE_FUNCTIONALITIES.md (redundant with spec)
- ❌ DOCUMENTATION.md (old API docs)
- ❌ IMPLEMENTATION_GUIDE.md (covered in README)
- ❌ INSTRUCTIONS_MANUAL.md (outdated)
- ❌ MIGRATION_CHANGES_SUMMARY.md (old migration notes)
- ❌ MIGRATION_CHECKLIST.md (completed)
- ❌ README_ENHANCED.md (duplicate of README)
- ❌ SUMMARY_OF_WORK_TODAY.md (daily summary)
- ❌ feature_list.md (outdated)
- ❌ fix-tailwind.js (temporary script)
- ❌ API_CONSTANTS_GUIDE.md (embedded in ARCHITECTURE.md)

---

## ✨ Next Steps

1. **Read README.md** to get running
2. **Review ARCHITECTURE.md** to understand the design
3. **Check SECURITY_AUDIT.md** before production
4. **Use ApiConstants** for any new API calls (backend or frontend)
5. **Run tests** and verify workflow approval chain works

### 🤖 **Understand the Entire Project (for AI/Developers)**
→ Read: **[INSTRUCTIONS_MANUAL.md](./INSTRUCTIONS_MANUAL.md)**
- Complete project overview
- All components in detail
- Code patterns and conventions
- Testing strategy
- **Read time:** 30 minutes

---

## 📖 Reading Path by Role

### For **New Developers**
1. Start: **ARCHITECTURE.md** (understand the design)
2. Then: **IMPLEMENTATION_GUIDE.md** (get it running)
3. Next: **DOCUMENTATION.md** (learn the API)
4. Finally: **SECURITY_AUDIT.md** (understand security)

### For **DevOps Engineers**
1. Start: **IMPLEMENTATION_GUIDE.md** (deployment section)
2. Then: **SECURITY_AUDIT.md** (hardening checklist)
3. Reference: **ARCHITECTURE.md** (for system design questions)

### For **API Consumers**
1. Start: **DOCUMENTATION.md** (all endpoints)
2. Reference: **ARCHITECTURE.md** (for context)
3. As needed: **IMPLEMENTATION_GUIDE.md** (troubleshooting)

### For **Security Team**
1. Start: **SECURITY_AUDIT.md** (current status)
2. Then: **ARCHITECTURE.md** (security architecture section)
3. Reference: **IMPLEMENTATION_GUIDE.md** (production checklist)

---

## 🎓 Quick Answers

### "How do I set up the project?"
→ [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md#-step-1-database-setup-5-min)

### "How do I create a form and collect responses?"
→ [DOCUMENTATION.md](./DOCUMENTATION.md#-form-management) + [ARCHITECTURE.md](./ARCHITECTURE.md#-how-it-works-form-publication)

### "What are the API endpoints?"
→ [DOCUMENTATION.md](./DOCUMENTATION.md#-quick-examples)

### "Is this secure?"
→ [SECURITY_AUDIT.md](./SECURITY_AUDIT.md#-security-features-already-implemented)

### "How do I deploy to production?"
→ [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md#-deployment-production) + [SECURITY_AUDIT.md](./SECURITY_AUDIT.md#-security-hardening-checklist)

### "Why is my form not publishing?"
→ [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md#-troubleshooting)

### "How does the rule engine work?"
→ [ARCHITECTURE.md](./ARCHITECTURE.md#-rule-engine)

### "What happens when I submit a form?"
→ [ARCHITECTURE.md](./ARCHITECTURE.md#-how-it-works-form-submission)

---

## 📋 All Documents Overview

```
README.md                      ← Project introduction
├─ ARCHITECTURE.md             ← How the system works (diagrams + flows)
├─ DOCUMENTATION.md            ← API reference + features
├─ IMPLEMENTATION_GUIDE.md     ← Setup & deployment steps
├─ SECURITY_AUDIT.md           ← Security analysis + hardening
├─ INSTRUCTIONS_MANUAL.md      ← Complete project details (for AI analysis)
└─ DOCUMENTATION_GUIDE.md      ← This file (navigation guide)
```

---

## 💡 Pro Tips

- **Ctrl+F (Cmd+F)** to search within documents
- **Bookmark** the API documentation for easy reference
- **Combine documents**: Read ARCHITECTURE while setting up (IMPLEMENTATION_GUIDE) to understand what's happening
- **Check troubleshooting** section before asking for help
- **Run through production checklist** before deploying

---

**Last Updated:** March 27, 2026
**Version:** 1.0-Final
