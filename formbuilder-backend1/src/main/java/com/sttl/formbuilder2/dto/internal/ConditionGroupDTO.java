package com.sttl.formbuilder2.dto.internal;

import com.sttl.formbuilder2.model.enums.ConditionLogic;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.util.List;

/**
 * ConditionGroupDTO — Nested Logical Group
 *
 * Part of the recursive rule engine. Represents a group like "(A AND B)".
 * Contains a list of nested entries and a logic operator to combine them.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ConditionGroupDTO extends RuleConditionEntryDTO {
    private ConditionLogic logic;
    private List<RuleConditionEntryDTO> conditions;

    public ConditionGroupDTO() {
        // Required for Jackson
    }
}
