# 🛡️ Security Audit & Hardening

Security analysis and actionable recommendations for FormBuilder3.

---

## 📊 Current Security Status

| Area | Status | Risk |
|------|--------|------|
| **Authentication** | ✅ Implemented | Low |
| **Authorization** | ✅ Implemented | Low |
| **SQL Injection** | ✅ Mitigated | Low |
| **Data Encryption** | ⚠️ Partial | Medium |
| **Rate Limiting** | ❌ Missing | High |
| **Brute Force** | ❌ Missing | High |
| **Session Security** | ✅ Good | Low |

---

## ✅ Security Features Already Implemented

### Authentication & Sessions
- ✅ Password hashing with BCrypt (industry standard)
- ✅ Session-based auth with JSESSIONID cookies
- ✅ Single session per user (if user logs in on Phone, their Laptop session ends)
- ✅ 15-minute session timeout
- ✅ Custom UserDetailsService for security

### Data Protection
- ✅ Parameterized SQL queries (prevents SQL injection)
- ✅ Column name validation against database schema
- ✅ Server-side rule evaluation (prevents tampering)
- ✅ HTTPOnly cookies (not accessible to JavaScript)

### Authorization
- ✅ Role-Based Access Control (RBAC)
- ✅ Module-level permissions
- ✅ Endpoint-level @PreAuthorize annotations

---

## ⚠️ Identified Vulnerabilities & Fixes

### 1. 🔴 Missing Rate Limiting (HIGH RISK)

**Problem:** No limit on login attempts or API calls. Attackers can brute force passwords or DDoS the API.

**Impact:** Brute force attacks, credential stuffing

**Fix:** Add Bucket4j rate limiting

**Step 1:** Add dependency to `pom.xml`:
```xml
<dependency>
    <groupId>com.glaforge</groupId>
    <artifactId>bucket4j-spring-boot-starter</artifactId>
    <version>7.8.0</version>
</dependency>
```

**Step 2:** Create `RateLimitingConfig.java`:
```java
@Configuration
public class RateLimitingConfig {
    @Bean
    public Bucket loginBucket() {
        Bandwidth limit = Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(1)));
        return Bucket4j.builder()
            .addLimit(limit)
            .build();
    }
}
```

**Step 3:** Update `AuthController.java`:
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    if (!loginBucket.tryConsume(1)) {
        return ResponseEntity.status(429).body("Too many login attempts. Try again later.");
    }
    // existing login logic
}
```

---

### 2. 🔴 Hardcoded Database Password (HIGH RISK)

**Problem:** Database credentials in `application.properties` are committed to Git

**Impact:** Credentials exposed if repository is public

**Fix:** Use environment variables

**Step 1:** Update `application.properties`:
```properties
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:root}
```

**Step 2:** On production server, set environment:
```bash
export DB_USERNAME=prod_user
export DB_PASSWORD=$(cat /etc/secrets/db_password.txt)
java -jar application.jar
```

**Step 3:** Or use application-prod.properties:
```properties
# src/main/resources/application-prod.properties
spring.datasource.password=${DB_PASSWORD}
```

**Run with profile:**
```bash
java -jar app.jar --spring.profiles.active=prod
```

---

### 3. 🟠 Missing HTTPS in Development (MEDIUM RISK)

**Problem:** Development uses HTTP; production should use HTTPS

**Impact:** Man-in-the-middle attacks, credential interception

**Fix:** Enable SSL/TLS

**Step 1:** Generate self-signed certificate (development only):
```bash
keytool -genkey -alias tomcat -storetype PKCS12 \
  -keyalg RSA -keysize 2048 \
  -keystore keystore.p12 -validity 365 \
  -storepass password
```

**Step 2:** Update `application-prod.properties`:
```properties
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=${SSL_KEY_PASSWORD}
server.ssl.key-store-type=PKCS12
server.port=8443
```

**Step 3:** Redirect HTTP to HTTPS:
```java
@Configuration
public class WebSecurityConfig {
    @Bean
    public EmbeddedServletContainerCustomizer containerCustomizer() {
        return container -> {
            container.getSession().setTrackingModes(
                Collections.singleton(SessionTrackingMode.COOKIE)
            );
        };
    }
}
```

---

### 4. 🟠 Missing Account Lockout (MEDIUM RISK)

**Problem:** No defense against brute force password guessing

**Impact:** Accounts vulnerable to credential attacks

**Fix:** Lock account after 5 failed attempts

**Step 1:** Add fields to `AppUser.java`:
```java
@Entity
public class AppUser {
    private int failedAttempts = 0;
    private LocalDateTime lockedTime;
    private boolean accountLocked = false;

    // getters/setters
}
```

**Step 2:** Update `AuthController.java`:
```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest req) {
    AppUser user = userRepository.findByUsername(req.getUsername());

    // Check if locked
    if (user.isAccountLocked() &&
        user.getLockedTime().plusHours(1).isAfter(LocalDateTime.now())) {
        return ResponseEntity.status(403)
            .body("Account locked. Try again in 1 hour.");
    }

    // Attempt authentication
    try {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                req.getUsername(),
                req.getPassword()
            )
        );

        // Success: reset counter
        user.setFailedAttempts(0);
        user.setAccountLocked(false);
        userRepository.save(user);

        return ResponseEntity.ok(new AuthResponse(auth));

    } catch (BadCredentialsException e) {
        // Failed: increment counter
        user.setFailedAttempts(user.getFailedAttempts() + 1);

        if (user.getFailedAttempts() >= 5) {
            user.setAccountLocked(true);
            user.setLockedTime(LocalDateTime.now());
        }

        userRepository.save(user);
        return ResponseEntity.status(401)
            .body("Invalid credentials. Attempts: " + user.getFailedAttempts() + "/5");
    }
}
```

---

### 5. 🟡 Missing CORS Configuration Hardening (LOW-MEDIUM RISK)

**Problem:** CORS allows all origins in development; should be restricted in production

**Impact:** Unauthorized cross-site requests

**Fix:** Update `WebConfig.java`:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://yourdomain.com")  // Production only
            .allowedMethods("GET", "POST", "PUT", "DELETE")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

---

### 6. 🟡 Missing Security Headers (LOW-MEDIUM RISK)

**Problem:** Missing HTTP security headers that prevent common attacks

**Impact:** Clickjacking, XSS, MIME type sniffing

**Fix:** Add to `SecurityConfig.java`:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers()
                .xssProtection()
                .and()
                .contentSecurityPolicy("default-src 'self'")
                .and()
                .frameOptions().sameOrigin()
            .and()
            .authorizeRequests()
                .antMatchers("/auth/**", "/runtime/**").permitAll()
                .anyRequest().authenticated();

        return http.build();
    }
}
```

**What it does:**
- `X-XSS-Protection`: Protects against cross-site scripting
- `Content-Security-Policy`: Controls what scripts can load
- `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking

---

## 🔒 Security Hardening Checklist

Before deploying to production:

### Database
- [ ] Change default PostgreSQL password
- [ ] Create dedicated user with limited privileges
- [ ] Enable SSL/TLS for database connections
- [ ] Use strong password (24+ characters, mixed case + symbols)
- [ ] Restrict network access to database (only backend can connect)
- [ ] Enable query logging for audit trail

### Application
- [ ] [ ] Update app-prod.properties with production values
- [ ] Enable HTTPS (generate proper SSL certificate from CA)
- [ ] Add rate limiting (see above)
- [ ] Add account lockout (see above)
- [ ] Set secure session cookies:
  ```properties
  server.servlet.session.cookie.secure=true
  server.servlet.session.cookie.http-only=true
  server.servlet.session.cookie.same-site=strict
  ```
- [ ] Remove Swagger UI from production
- [ ] Enable logging and monitoring

### Deployment
- [ ] Use strong database password (not "root")
- [ ] Disable debug mode in production
- [ ] Keep Spring Boot and dependencies updated
- [ ] Implement WAF (Web Application Firewall)
- [ ] Set up automated security scanning
- [ ] Create backup strategy
- [ ] Document all security procedures

### Code Review
- [ ] No hardcoded secrets in code
- [ ] All user inputs validated
- [ ] SQL queries parameterized
- [ ] Error messages don't leak system details
- [ ] Audit logs capture sensitive operations

---

## 🚨 Attack Scenarios & Mitigations

### Scenario: Brute Force Password Attack
```
Attacker: Tries 1000 password combinations per minute
Current:  No limit, attacker succeeds eventually
Fixed:    Rate limiting + account lockout
```

### Scenario: SQL Injection Attack
```
Attacker: Enters '; DROP TABLE forms;--
Current:  Prevented by parameterized queries
Status:   ✅ Already protected
```

### Scenario: Session Hijacking
```
Attacker: Steals JSESSIONID cookie
Current:  HTTPOnly flag prevents JavaScript access
Fixed:    Use HTTPS + Secure flag
```

### Scenario: Cross-Site Scripting (XSS)
```
Attacker: Injects <script>alert('hacked')</script>
Current:  React escapes HTML by default
Fixed:    Add CSP headers, verify on backend
```

---

## 🔍 Security Testing Checklist

| Test | Command | Expected Result |
|------|---------|-----------------|
| **HTTPS Check** | `curl -I https://localhost:8443` | 200 OK |
| **Rate Limiting** | Send 6 login requests in 60 sec | 6th request → 429 |
| **Account Lockout** | 5 wrong passwords | Account locked message |
| **CORS** | Request from different origin | CORS error |
| **SQL Injection** | `POST /forms {"name": "'; DROP TABLE--"}` | Rejected safely |
| **Session Timeout** | Wait 15 min, access protected endpoint | 401 Unauthorized |

---

## 📋 Production Deployment Checklist

```
Security Pre-Launch
├─ [ ] SSL/TLS certificate installed
├─ [ ] Database backup enabled & tested
├─ [ ] Rate limiting configured & tested
├─ [ ] Account lockout enabled
├─ [ ] Environment variables set (no hardcoded secrets)
├─ [ ] Logging & monitoring active
├─ [ ] Firewall rules configured
├─ [ ] WAF (if using) rules set
├─ [ ] Admin account password changed
├─ [ ] Test user accounts created & documented
└─ [ ] Incident response plan documented
```

---

## 📞 Incident Response

### If Database is Compromised:
1. ✅ Revoke database credentials immediately
2. ✅ Create new database with new password
3. ✅ Audit all user accounts for unauthorized access
4. ✅ Force password reset for all users
5. ✅ Review audit logs from time of breach onwards

### If Code Repository is Compromised:
1. ✅ Rotate all credentials (DB password, API keys, secrets)
2. ✅ Review all recent commits
3. ✅ Deploy clean version to production
4. ✅ Audit server logs

---

## 🔐 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Spring Security Best Practices](https://spring.io/projects/spring-security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

→ [See IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) to deploy
→ [Back to ARCHITECTURE.md](./ARCHITECTURE.md)
