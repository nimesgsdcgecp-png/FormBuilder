package com.sttl.formbuilder2.dto;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Data;
import java.util.List;

@Data
public class FormDefinitionDTO {
    private String title;
    private String description;
    private List<FieldDefinitionDTO> fields;
    private FormStatus status;

    private List<FormRuleDTO> rules;
}