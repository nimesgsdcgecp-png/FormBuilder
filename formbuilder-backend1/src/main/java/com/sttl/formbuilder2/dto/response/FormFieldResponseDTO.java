package com.sttl.formbuilder2.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sttl.formbuilder2.model.enums.FieldType;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * FormFieldResponseDTO — A Single Field as Returned in an API Response
 *
 * What it does:
 * Represents the serialised view of a
 * {@link com.sttl.formbuilder2.model.entity.FormField}
 * entity, embedded inside a {@link FormVersionResponseDTO}. Consumed by both
 * the
 * builder (to reload existing fields) and the public form page (to render
 * inputs).
 *
 * Application flow:
 * FormService.toDetailDTO() maps each FormField entity → FormFieldResponseDTO
 * → embedded in FormVersionResponseDTO → embedded in FormDetailResponseDTO
 * → consumed by:
 * - Builder page: restores the canvas field list
 * - Public page: renders each field as the correct HTML input type
 * - Responses page: builds table column headers
 *
 * Key fields:
 * - {@code fieldType} — determines how the field is rendered (TEXT, DATE, etc.)
 * - {@code columnName} — SQL column name; used as the key when building the
 * submission JSON payload.
 * - {@code validationRules} — deserialized JSONB constraints (required, min,
 * max, etc.)
 * - {@code options} — choices for Dropdown/Radio, grid config, or lookup
 * config.
 */
@Data
@Builder
public class FormFieldResponseDTO {
    private Long id;
    private String fieldLabel;
    private String columnName;
    private FieldType fieldType;
    private Boolean isMandatory;
    private String defaultValue;
    private Object options;
    private Map<String, Object> validationRules;
    private Integer ordinalPosition;
    private String calculationFormula;
    private String helpText;
    private Boolean isHidden;
    private Boolean isReadOnly;
    private Boolean isDisabled;
    @JsonProperty("isMultiSelect")
    private Boolean isMultiSelect;
    private java.util.List<FormFieldResponseDTO> children;
}
