package com.sttl.formbuilder2.dto.response;

import lombok.Data;

@Data
public class FieldValidationResponseDTO {
    private String id;
    private String fieldKey;
    private String scope;
    private String expression;
    private String errorMessage;
    private Integer executionOrder;
}
