package com.sttl.formbuilder2.dto;

import com.sttl.formbuilder2.model.enums.RuleOperator;
import lombok.Data;

@Data
public class RuleConditionDTO {
    private String field;
    private RuleOperator operator;
    private Object value; // Using Object because it could be a String, Integer, or Boolean
}