package com.sttl.formbuilder2.dto.internal;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Data;

/**
 * RuleConditionEntryDTO — Abstract Base for Recursive Conditions
 *
 * Allows FormRuleDTO.conditions to contain both simple leaf conditions
 * (RuleConditionDTO) and nested groups (ConditionGroupDTO).
 *
 * Discriminated by the "type" property in JSON:
 * - "condition" -> RuleConditionDTO
 * - "group" -> ConditionGroupDTO
 */
@Data
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type", defaultImpl = RuleConditionDTO.class)
@JsonSubTypes({
        @JsonSubTypes.Type(value = RuleConditionDTO.class, name = "condition"),
        @JsonSubTypes.Type(value = ConditionGroupDTO.class, name = "group")
})
public abstract class RuleConditionEntryDTO {
    private String id; // Optional ID for the entry
}
