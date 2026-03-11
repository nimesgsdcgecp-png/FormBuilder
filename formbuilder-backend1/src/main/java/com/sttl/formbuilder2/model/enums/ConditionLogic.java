package com.sttl.formbuilder2.model.enums;

/**
 * ConditionLogic — How Multiple Conditions Within a Rule Are Combined
 *
 * Currently stored in {@code FormRuleDTO.conditionLogic} and persisted as part
 * of
 * the rules JSON in
 * {@link com.sttl.formbuilder2.model.entity.FormVersion#   rules}.
 *
 * AND — All conditions in the rule must be true for actions to fire.
 * OR — Any single condition being true is sufficient to fire actions.
 *
 * Note: The current {@code RuleEngineService} implementation evaluates only the
 * first condition (index 0) of each rule. Full multi-condition AND/OR
 * evaluation
 * can be added later using this enum as the control flag.
 */
public enum ConditionLogic {
    AND,
    OR
}