package com.sttl.formbuilder2.dto;

import com.sttl.formbuilder2.model.enums.ActionType;
import lombok.Data;

@Data
public class RuleActionDTO {
    private ActionType type;
    private String targetField;
    private String message;
}