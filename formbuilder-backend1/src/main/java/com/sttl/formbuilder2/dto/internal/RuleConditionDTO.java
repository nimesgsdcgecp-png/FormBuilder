package com.sttl.formbuilder2.dto.internal;

import com.sttl.formbuilder2.model.enums.RuleOperator;
import lombok.Data;

/**
 * RuleConditionDTO — Internal Condition Representation for the Rule Engine
 *
 * What it does:
 * Deserialized from the JSON rules stored in
 * {@link com.sttl.formbuilder2.model.entity.FormVersion#rules}. Represents the
 * IF part of a single rule evaluated by
 * {@code RuleEngineService.evaluateCondition()}.
 *
 * Why it's in {@code dto.internal}:
 * The API-facing equivalent is
 * {@link com.sttl.formbuilder2.dto.request.RuleConditionRequestDTO}, used when
 * saving form rules from the builder. This DTO is only used to read rules from
 * the database during form submission processing.
 *
 * Fields:
 * - {@code field} — the SQL fieldKey of the answer to evaluate.
 * - {@code operator} — comparison type (EQUALS, CONTAINS, GREATER_THAN, etc.)
 * - {@code value} — the target value to compare against
 * (String/Number/Boolean).
 */
@Data
@lombok.EqualsAndHashCode(callSuper = true)
public class RuleConditionDTO extends RuleConditionEntryDTO {
    private String field;
    private RuleOperator operator;
    private Object value; // Could be String, Integer, or Boolean
    private String valueType; // "STATIC" or "FIELD"
}
