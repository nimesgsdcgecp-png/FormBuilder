package com.sttl.formbuilder2.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sttl.formbuilder2.model.enums.FieldType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/**
 * FieldDefinitionRequestDTO — Describes a Single Field in a Form
 * Creation/Update Request
 *
 * What it does:
 * Carries all metadata needed to define one field when creating or updating a
 * form.
 * This DTO is embedded as a list inside {@link CreateFormRequestDTO} and
 * {@link UpdateFormRequestDTO}.
 *
 * Application flow:
 * Frontend builder → POST/PUT /api/forms → CreateFormRequestDTO /
 * UpdateFormRequestDTO
 * └── List<FieldDefinitionRequestDTO> → FormService → FormField entity +
 * DynamicTableService DDL
 *
 * Key fields:
 * - {@code label} — display label shown to respondents (e.g. "Full Name").
 * Also used by {@code DynamicTableService} to generate
 * the SQL column name (e.g. "full_name").
 * - {@code type} — determines the HTML input and PostgreSQL column type.
 * - {@code required} — mapped to
 * {@link com.sttl.formbuilder2.model.entity.FormField#isRequired}.
 * - {@code options} — JSON-compatible object for choice/grid/lookup fields.
 * - {@code validation} — map of additional constraints (min, max, minLength,
 * maxLength, pattern) stored as JSONB in {@code form_fields}.
 * - {@code defaultValue} — optional pre-fill value stored in the FormField
 * entity.
 */
@Data
public class FieldDefinitionRequestDTO {
    @NotBlank(message = "Field label is required")
    private String label;

    private String fieldKey;

    @NotNull(message = "Field type is required")
    private FieldType type;

    private boolean required;
    private Object options;
    private Map<String, Object> validation;
    private String defaultValue;
    private String calculationFormula;
    private String helpText;
    private boolean hidden;
    private boolean readOnly;
    private boolean disabled;
    @JsonProperty("isMultiSelect")
    private boolean isMultiSelect;

    @Valid
    private java.util.List<FieldDefinitionRequestDTO> children;
}
