package com.sttl.formbuilder2.model.enums;

/**
 * RuleOperator — Comparison Operator Used in Logic Rule Conditions
 *
 * Each value is evaluated by {@code RuleEngineService.evaluateCondition()} when
 * a
 * form submission is received. The comparison is always between the user's
 * submitted
 * answer and the value configured in the rule.
 *
 * EQUALS — Exact match (case-insensitive string comparison)
 * NOT_EQUALS — Inverse of EQUALS
 * CONTAINS — Substring match (user answer contains the rule value)
 * GREATER_THAN — Numeric comparison: user answer > rule value
 * LESS_THAN — Numeric comparison: user answer < rule value
 *
 * Note: GREATER_THAN and LESS_THAN parse both operands as doubles. If either
 * cannot
 * be parsed (e.g. applied to a text field), the condition safely returns
 * {@code false}.
 */
public enum RuleOperator {
    EQUALS,
    NOT_EQUALS,
    GREATER_THAN,
    LESS_THAN,
    CONTAINS
}