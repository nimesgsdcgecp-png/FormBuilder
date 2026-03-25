package com.sttl.formbuilder2.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * FormVersionResponseDTO — A Single Version Snapshot in an API Response
 *
 * What it does:
 * Represents one published snapshot of a form's schema as returned by the API.
 * Embedded inside {@link FormDetailResponseDTO#versions}.
 *
 * Application flow:
 * FormService.toDetailDTO() maps each FormVersion entity →
 * FormVersionResponseDTO
 * → List embedded in FormDetailResponseDTO
 * → Consumed by:
 * - Builder page: reads versions[0].fields to reload the canvas
 * - Public form page: reads versions[0].fields to render inputs
 * - Responses page: reads versions[0].fields to build column headers
 *
 * Key fields:
 * - {@code versionNumber} — monotonically increasing counter per form.
 * - {@code fields} — ordered list of field definitions for this snapshot.
 * - {@code rules} — the raw JSON string of logic rules (not deserialized
 * here; exposed as-is for the frontend LogicPanel to
 * parse back into editable rule objects).
 */
@Data
@Builder
public class FormVersionResponseDTO {
    private Long id;
    private Integer versionNumber;
    private String changeLog;
    private Boolean isActive;
    private String activatedBy;
    private String activatedAt;
    private Object rules;
    private List<FieldValidationResponseDTO> formValidations;
    private List<FormFieldResponseDTO> fields;
}
