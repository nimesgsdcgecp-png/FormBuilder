# 🚀 Implementation Guide

Get FormBuilder3 up and running in 15 minutes.

---

## ✅ Prerequisites

Before starting, ensure you have:

| Component | Version | Status |
|-----------|---------|--------|
| **Java** | 21+ | [Download](https://www.oracle.com/java/technologies/downloads/#java21) |
| **Node.js** | 18+ | [Download](https://nodejs.org) |
| **PostgreSQL** | 14+ | [Download](https://www.postgresql.org/download) |
| **Maven** | 3.9+ | Usually bundled with Java IDEs |
| **Git** | Latest | For version control |

**Check your versions:**
```bash
java -version
node -v
npm -v
psql --version
mvn -v
```

---

## 🗄️ Step 1: Database Setup (5 min)

### 1a. Start PostgreSQL
```bash
# Windows (if installed as service)
# Already running, or start from Services

# macOS
brew services start postgresql

# Linux
sudo service postgresql start
```

### 1b. Create Database
```bash
# Open PostgreSQL prompt
psql -U postgres

# In psql, run:
CREATE DATABASE formbuilder2;

# Verify
\l
# You should see "formbuilder2" in the list

# Exit
\q
```

### 1c. Verify Connection
```bash
psql -U postgres -d formbuilder2 -c "SELECT 1;"
# Output:
#  ?column?
# ----------
#         1
```

> **Note:** Database tables are created automatically by Hibernate on first backend startup.

---

## 🏃 Step 2: Backend Setup (5 min)

### 2a. Navigate to Backend
```bash
cd formbuilder-backend1
```

### 2b. Verify Configuration
Open `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/formbuilder2
spring.datasource.username=postgres
spring.datasource.password=root
```

> **Change if needed:** If your PostgreSQL password is different, update the `password` field.

### 2c. Build & Run
```bash
# Option 1: Using Maven (recommended)
mvn clean install
mvn spring-boot:run

# Option 2: Build first, then run JAR
mvn clean package
java -jar target/formbuilder2-0.0.1-SNAPSHOT.jar

# Option 3: In your IDE
# Right-click Formbuilder2Application.java → Run
```

### 2d. Verify Backend Started
```bash
curl http://localhost:8080/swagger-ui.html

# You should see the Swagger UI interface
# (or check for "Started Formbuilder2Application in X seconds" in console)
```

✅ **Backend is ready at:** `http://localhost:8080`

---

## 🎨 Step 3: Frontend Setup (5 min)

### 3a. Navigate to Frontend
```bash
cd formbuilder-frontend1
```

### 3b. Install Dependencies
```bash
npm install

# This downloads ~500MB of packages
# (First time only)
```

### 3c. Update API URL (if needed)
Open `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8080/api/v1';
```

> Only change if backend is on a different machine/port.

### 3d. Start Frontend
```bash
npm run dev

# Output:
# ▲ Next.js 16.1.6
# - Local:        http://localhost:3000
# - Environments: .env, .env.local
```

✅ **Frontend is ready at:** `http://localhost:3000`

---

## 🎯 Step 4: First-Time Testing (Not mandatory, but helpful)

### 4a. Access Application
Open your browser: `http://localhost:3000`

### 4b. Create Test Account
1. Click **Register**
2. Enter:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Password123`
3. Click **Register**

### 4c. Login
1. Click **Login**
2. Enter credentials from above
3. You're now on the Dashboard

### 4d. Create Your First Form
1. Click **Create Form**
2. Enter title: "My First Form"
3. Click **Enter Builder**
4. Add a field by dragging "Text Input" to canvas
5. Save the form (Ctrl+S or click Save)
6. Click **Publish** (this creates the database table!)
7. Click **Share** to get public link

### 4e. Test Submission
1. Copy the public link
2. Open in new incognito window
3. Fill and submit the form
4. Check **Responses** tab in your form—submission should appear!

---

## 🎓 Building Your First Real Application

### Use Case: Customer Feedback Form

#### Step 1: Create Form
```bash
curl -X POST http://localhost:8080/api/v1/forms \
  -H "Content-Type: application/json" \
  -H "Cookie: JSESSIONID=your_session_id" \
  -d '{
    "title": "Customer Feedback",
    "code": "customer_feedback",
    "description": "Help us improve your experience"
  }'
```

#### Step 2: Publish Form
```bash
curl -X POST http://localhost:8080/api/v1/forms/1/publish \
  -H "Cookie: JSESSIONID=your_session_id"
```

#### Step 3: Get Public Link
Response includes `shareToken`. Form is now at:
```
http://localhost:3000/f/{shareToken}
```

#### Step 4: Share with Users
Send the public link to customers. They can fill and submit without logging in.

#### Step 5: View Responses
```bash
curl http://localhost:8080/api/v1/forms/1/submissions \
  -H "Cookie: JSESSIONID=your_session_id"
```

---

## 📦 Deployment (Production)

### Backend Deployment

#### Option 1: Heroku
```bash
# Install Heroku CLI
npm install -g heroku
heroku login

# Create app
heroku create formbuilder-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main
```

#### Option 2: Docker
```bash
# Build Docker image
docker build -t formbuilder:latest .

# Run with PostgreSQL
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/formbuilder2 \
  formbuilder:latest
```

#### Option 3: Standalone JAR
```bash
# Build
mvn clean package

# Run on server
java -jar target/formbuilder2-0.0.1-SNAPSHOT.jar \
  --spring.datasource.url=jdbc:postgresql://prod-db:5432/formbuilder2 \
  --spring.datasource.username=postgres \
  --spring.datasource.password=$(cat /secrets/db_password)
```

### Frontend Deployment

#### Option 1: Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Update NEXT_PUBLIC_API_URL to production backend
```

#### Option 2: Netlify
```bash
npm run build

# Upload 'out' folder to Netlify
# Set environment variable: NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

#### Option 3: Your Own Server (nginx)
```bash
# Build
npm run build
npm run start

# Behind nginx (proxy pass to port 3000)
```

---

## 🔒 Production Security Checklist

Before going live, complete this checklist:

```
Database Security
├─ [ ] Change default PostgreSQL password
├─ [ ] Enable SSL/TLS for database connection
├─ [ ] Set up regular backups
└─ [ ] Restrict database access to backend only

Backend Security
├─ [ ] Update application.properties with production DB credentials
├─ [ ] Enable HTTPS (set server.ssl.key-store, etc.)
├─ [ ] Set secure session cookies:
│       server.servlet.session.cookie.secure=true
│       server.servlet.session.cookie.http-only=true
│       server.servlet.session.cookie.same-site=strict
├─ [ ] Implement rate limiting (add to WebConfig)
├─ [ ] Enable brute force protection (5 failed login attempts = lock)
├─ [ ] Set up logging and monitoring
└─ [ ] Configure CORS properly (not localhost:3000)

Frontend Security
├─ [ ] Update NEXT_PUBLIC_API_URL to production domain
├─ [ ] Enable CSP (Content Security Policy) headers
├─ [ ] Use HTTPS only (no http://)
└─ [ ] Set up error tracking (Sentry, etc.)

Operational
├─ [ ] Set up automated backups
├─ [ ] Configure monitoring & alerts
├─ [ ] Document deployment process
├─ [ ] Create runbooks for common issues
└─ [ ] Test disaster recovery
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `Connection refused`
```
Solution: Ensure PostgreSQL is running
- Windows: Check Services (services.msc)
- macOS: brew services start postgresql
- Linux: sudo systemctl start postgresql
```

**Error:** `Database "formbuilder2" does not exist`
```
Solution: Create database
psql -U postgres -c "CREATE DATABASE formbuilder2;"
```

**Error:** `Authentication failed for user "postgres"`
```
Solution: Check password in application.properties
- Default: root
- If you set custom password, update it
```

### Frontend Won't Connect to Backend

**Error:** `Failed to fetch from http://localhost:8080/api/v1`
```
Solution 1: Check backend is running
- curl http://localhost:8080/swagger-ui.html

Solution 2: Check API URL in src/services/api.ts
- Should be http://localhost:8080/api/v1

Solution 3: Check CORS in backend
- Open src/main/java/.../config/WebConfig.java
- Ensure .allowedOrigins("http://localhost:3000") exists
```

### Form Won't Publish

**Error:** `400 Bad Request: Schema validation failed`
```
Solution: Check field types and rules
- Ensure all fields have column_name
- Ensure all rule operators are valid
- Check field_type is in supported list
```

### Can't Submit Form

**Error:** `403 Forbidden`
```
Solution: Check if form is published and public
- Go to form settings
- Ensure "Allow public submissions" is checked
```

---

## 🔗 Useful Commands

### PostgreSQL
```bash
# Connect to database
psql -U postgres -d formbuilder2

# List all tables
\dt

# Show table structure
\d form_fields

# Run SQL query
SELECT * FROM forms;

# Exit
\q
```

### Backend
```bash
# Build only (no run)
mvn clean compile

# Run tests
mvn test

# View logs
tail -f logs/spring-boot.log

# Stop backend
Ctrl + C
```

### Frontend
```bash
# Build only
npm run build

# Start production build
npm start

# Check for TypeScript errors
npm run lint

# Stop frontend
Ctrl + C
```

### Git
```bash
# Check what you've changed
git status

# See detailed changes
git diff

# Commit changes
git add .
git commit -m "Your message"

# Push to remote
git push origin main
```

---

## 📚 File Quick Reference

| Directory | Purpose |
|-----------|---------|
| `formbuilder-backend1/` | Spring Boot backend |
| `formbuilder-backend1/src/main/java/com/sttl/formbuilder2` | Core Java code |
| `formbuilder-backend1/src/main/resources` | Configuration files |
| `formbuilder-frontend1/` | Next.js frontend |
| `formbuilder-frontend1/src/app` | Pages and layouts |
| `formbuilder-frontend1/src/components` | React components |
| `formbuilder-frontend1/src/store` | Zustand state management |

---

## 🎓 Next Steps

1. **Read ARCHITECTURE.md** to understand how it works
2. **Read API DOCUMENTATION.md** to see all endpoints
3. **Review SECURITY_AUDIT.md** before production
4. **Test the application** with different scenarios
5. **Deploy** to your server/cloud

---

## 💬 FAQ

**Q: Can I change the default port 8080?**
```
A: Yes. In application.properties:
server.port=9090
```

**Q: Can I use a different database other than PostgreSQL?**
```
A: Not recommended. The code uses PostgreSQL-specific features.
To migrate: Update spring.jpa.hibernate.dialect and JDBC driver
```

**Q: How do I reset the database?**
```
A:
psql -U postgres -c "DROP DATABASE formbuilder2;"
psql -U postgres -c "CREATE DATABASE formbuilder2;"
Then restart backend to recreate tables
```

**Q: How do I backup my data?**
```
A: PostgreSQL backup:
pg_dump -U postgres formbuilder2 > backup.sql

Restore:
psql -U postgres formbuilder2 < backup.sql
```

---

→ [See ARCHITECTURE.md](./ARCHITECTURE.md) for system design
→ [See DOCUMENTATION.md](./DOCUMENTATION.md) for API details
→ [See SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for hardening
