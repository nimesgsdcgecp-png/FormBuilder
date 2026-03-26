package com.sttl.formbuilder2.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * FormBuilderLimitsConfig — SRS Section 10 Limits & Guardrails
 *
 * Configures the maximum allowed values for forms as per SRS:
 * - Max 50 fields per form
 * - Max 100 validations per form
 * - Max 10 pages/sections per form
 * - Max payload size: 100 KB
 * - Max file upload size: 5 MB (configured in application.properties)
 */
@Configuration
@ConfigurationProperties(prefix = "formbuilder.limits")
@Getter
@Setter
public class FormBuilderLimitsConfig {

    private int maxFieldsPerForm = 50;
    private int maxValidationsPerForm = 100;
    private int maxPagesPerForm = 10;
    private int maxPayloadSizeKb = 100;
}
