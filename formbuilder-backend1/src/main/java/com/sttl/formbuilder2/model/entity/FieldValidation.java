package com.sttl.formbuilder2.model.entity;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "field_validations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FieldValidation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "form_version_id", nullable = false)
    private UUID formVersionId;

    @Column(name = "field_key", nullable = false, length = 64)
    private String fieldKey; // Empty validation targets the entire form

    @Column(nullable = false, length = 20)
    private String validationType;

    @Column(nullable = false, length = 20)
    private String scope; // "FIELD" or "FORM"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String expression; // e.g. "salary > 0 && department == \"HR\""

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "execution_order", nullable = false)
    private Integer executionOrder;
}
