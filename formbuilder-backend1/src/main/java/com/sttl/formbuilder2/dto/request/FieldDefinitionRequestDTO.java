package com.sttl.formbuilder2.dto.request;

import com.sttl.formbuilder2.model.enums.FieldType;
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
 * {@link com.sttl.formbuilder2.model.entity.FormField#isMandatory}.
 * - {@code options} — JSON-compatible object for choice/grid/lookup fields.
 * - {@code validation} — map of additional constraints (min, max, minLength,
 * maxLength, pattern) stored as JSONB in {@code form_fields}.
 * - {@code defaultValue} — optional pre-fill value stored in the FormField
 * entity.
 */
@Data
public class FieldDefinitionRequestDTO {
    private String label;
    private FieldType type;
    private boolean required;
    private Object options;
    private Map<String, Object> validation;
    private String defaultValue;
}
