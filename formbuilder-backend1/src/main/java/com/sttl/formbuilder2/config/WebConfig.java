package com.sttl.formbuilder2.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * WebConfig — Global CORS Configuration
 *
 * What it does:
 * Configures Cross-Origin Resource Sharing (CORS) so that the Next.js frontend
 * (running on http://localhost:3000) is permitted to make HTTP requests to this
 * Spring Boot backend (running on http://localhost:8080).
 *
 * Why it's needed:
 * Browsers block cross-origin requests by default (same-origin policy). Without
 * this configuration every API call from the frontend would fail with a CORS
 * error.
 *
 * Design note:
 * The wildcard ("/**") mapping allows CORS on all endpoints. Allowed HTTP
 * methods
 * cover the full REST surface used by this application — GET, POST, PUT,
 * DELETE,
 * and OPTIONS (preflight checks). {@code allowCredentials(true)} is required
 * for
 * cookie-based sessions if authentication is added in the future.
 *
 * Production hint:
 * Replace "http://localhost:3000" with the actual deployed frontend domain
 * before
 * going to production.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Allow all endpoints
                .allowedOrigins("http://localhost:3000") // Allow Next.js frontend
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}