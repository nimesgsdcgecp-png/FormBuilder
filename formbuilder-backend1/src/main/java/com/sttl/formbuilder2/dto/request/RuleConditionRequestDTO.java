package com.sttl.formbuilder2.dto.request;

import com.sttl.formbuilder2.model.enums.RuleOperator;
import lombok.Data;

/**
 * RuleConditionRequestDTO — The IF Part of a Logic Rule (API Input Shape)
 *
 * What it does:
 * Carries a single condition within a {@link FormRuleRequestDTO}. Describes
 * which
 * field is evaluated, how it is compared, and what value triggers the rule.
 *
 * Application flow:
 * Frontend LogicPanel → FormRuleRequestDTO.conditions → serialised to JSON
 * → stored in FormVersion.rules
 * → deserialized at submission time into dto.internal.RuleConditionDTO
 * → evaluated by RuleEngineService.evaluateCondition()
 *
 * Fields:
 * - {@code field} — the SQL {@code columnName} of the field being evaluated.
 * - {@code operator} — comparison operator (e.g. EQUALS, GREATER_THAN).
 * - {@code value} — the value to compare the submission answer against.
 */
@Data
public class RuleConditionRequestDTO {
    private String field;
    private RuleOperator operator;
    private Object value;
}
