package com.sttl.formbuilder2.dto.response;

import java.util.UUID;

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
 * - {@code fieldKey} — SQL column name; used as the key when building the
 * submission JSON payload.
 * - {@code validationRules} — deserialized JSONB constraints (required, min,
 * max, etc.)
 * - {@code options} — choices for Dropdown/Radio, grid config, or lookup
 * config.
 */
@Data
@Builder
public class FormFieldResponseDTO {
    private UUID id;
    
    @com.fasterxml.jackson.annotation.JsonProperty("label")
    private String label;
    
    @com.fasterxml.jackson.annotation.JsonProperty("columnName")
    private String columnName;
    
    private String parentColumnName;
    
    @com.fasterxml.jackson.annotation.JsonProperty("type")
    private FieldType type;
    
    @com.fasterxml.jackson.annotation.JsonProperty("required")
    private Boolean required;
    
    private String defaultValue;
    private Object options;
    
    @com.fasterxml.jackson.annotation.JsonProperty("validation")
    private Map<String, Object> validation;
    
    private Integer displayOrder;
    private String calculationFormula;
    private String helpText;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isHidden")
    private Boolean isHidden;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isReadOnly")
    private Boolean isReadOnly;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isDisabled")
    private Boolean isDisabled;
    
    @JsonProperty("isMultiSelect")
    private Boolean isMultiSelect;
    
    private java.util.List<FormFieldResponseDTO> children;
}
