package com.sttl.formbuilder2.dto.internal;

import com.sttl.formbuilder2.model.enums.ActionType;
import lombok.Data;

/**
 * RuleActionDTO — Internal Action Representation for the Rule Engine
 *
 * What it does:
 * Deserialized from the JSON rules stored in
 * {@link com.sttl.formbuilder2.model.entity.FormVersion#rules}. Represents the
 * THEN part of a single rule executed by {@code RuleEngineService} when the
 * associated condition evaluates to {@code true}.
 *
 * Why it's in {@code dto.internal}:
 * The API-facing equivalent is
 * {@link com.sttl.formbuilder2.dto.request.RuleActionRequestDTO}, used when
 * saving form rules from the builder. This DTO is only used during submission
 * processing — never received directly from an HTTP request.
 *
 * Fields:
 * - {@code type} — what to do (REQUIRE, VALIDATION_ERROR, SEND_EMAIL, etc.)
 * - {@code targetField} — the fieldKey of the field to act on (for
 * SHOW/HIDE/REQUIRE).
 * - {@code message} — custom error text for VALIDATION_ERROR, or the recipient
 * email address for SEND_EMAIL.
 */
@Data
public class RuleActionDTO {
    private ActionType type;
    private String targetField;
    private String message;
}
