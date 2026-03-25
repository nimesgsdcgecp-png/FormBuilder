package com.sttl.formbuilder2.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

@Data
public class FieldValidationRequestDTO {

    private String fieldKey; // Empty validation targets the entire form

    @NotBlank(message = "Scope is required")
    @Pattern(regexp = "^(FIELD|FORM)$", message = "Scope must be FIELD or FORM")
    private String scope;

    @NotBlank(message = "Expression is required")
    private String expression;

    @NotBlank(message = "Error message is required")
    private String errorMessage;

    @NotNull(message = "Execution order is required")
    private Integer executionOrder;
}
