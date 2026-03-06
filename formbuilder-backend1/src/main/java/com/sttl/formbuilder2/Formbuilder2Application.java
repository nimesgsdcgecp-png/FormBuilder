package com.sttl.formbuilder2;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * FormBuilder2 Application — Entry Point
 *
 * This is the main Spring Boot bootstrap class for the FormBuilder backend.
 *
 * What it does:
 * - Triggers Spring Boot's auto-configuration, component scanning, and
 * JPA setup for all classes inside the {@code com.sttl.formbuilder2} package.
 *
 * Application flow overview:
 * Browser / Next.js (port 3000)
 * └── HTTP requests
 * └── FormController / FileUploadController (REST layer)
 * └── FormService / SubmissionService (business logic)
 * └── FormRepository / JdbcTemplate (data layer)
 * └── PostgreSQL database
 *
 * The backend runs on port 8080 by default (see application.properties).
 */
@SpringBootApplication
public class Formbuilder2Application {

	public static void main(String[] args) {
		SpringApplication.run(Formbuilder2Application.class, args);
	}

}
