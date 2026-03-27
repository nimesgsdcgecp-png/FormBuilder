# 🚀 Implementation Guide - FormBuilder3

## 🛠️ Prerequisites
| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Java** | 21+ | Backend Runtime |
| **Node.js** | 20+ | Frontend Runtime |
| **PostgreSQL**| 14+ | Relational Database |
| **Maven** | 3.9+ | Backend Build Tool |

---

## 🏗️ 1. Database Setup
1. Create a fresh PostgreSQL database:
```bash
psql -U postgres -c "CREATE DATABASE formbuilder2;"
```
2. Verify connection settings in `formbuilder-backend1/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/formbuilder2
spring.datasource.username=postgres
spring.datasource.password=root
```
> [!NOTE]
> The application uses `hibernate.ddl-auto=validate`. Ensure the base schema is created via migrations or manual SQL before starting if not using secondary initialization.

---

## ⚙️ 2. Backend Setup
1. Navigate to the backend directory:
```bash
cd formbuilder-backend1
```
2. Build and run:
```bash
mvn clean install
mvn spring-boot:run
```
- **API URL**: `http://localhost:8080/api/v1`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`

---

## 🎨 3. Frontend Setup
1. Navigate to the frontend directory:
```bash
cd formbuilder-frontend1
```
2. Install dependencies:
```bash
npm install
```
3. Update API Endpoint (if not localhost) in `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8080/api/v1';
```
4. Run development server:
```bash
npm run dev
```
- **Web App**: `http://localhost:3000`

---

## 🚢 4. Production Deployment
### Backend (JAR)
```bash
mvn package -DskipTests
java -jar target/formbuilder-backend1-0.0.1-SNAPSHOT.jar
```
### Frontend (Static/Node)
```bash
npm run build
npm start
```

### Security Checkliste (Production)
- [ ] Change `spring.datasource.password`.
- [ ] Enable HTTPS/TLS in `application.properties`.
- [ ] Set `server.servlet.session.cookie.secure=true`.
- [ ] Implement Rate Limiting (See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)).

---
[ARCHITECTURE.md](./ARCHITECTURE.md) | [DOCUMENTATION.md](./DOCUMENTATION.md)
