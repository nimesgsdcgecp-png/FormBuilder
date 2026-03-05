package com.sttl.formbuilder2.dto;

import com.sttl.formbuilder2.model.enums.ConditionLogic;
import lombok.Data;
import java.util.List;

@Data
public class FormRuleDTO {
    private String id;
    private String name;
    private ConditionLogic conditionLogic;
    private List<RuleConditionDTO> conditions;
    private List<RuleActionDTO> actions;
}