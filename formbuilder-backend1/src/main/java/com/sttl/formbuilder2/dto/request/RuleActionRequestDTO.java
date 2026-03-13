package com.sttl.formbuilder2.dto.request;

import com.sttl.formbuilder2.model.enums.ActionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * RuleActionRequestDTO — The THEN Part of a Logic Rule (API Input Shape)
 *
 * What it does:
 * Carries a single action within a {@link FormRuleRequestDTO}. Describes what
 * should happen when the rule's condition is met.
 *
 * Application flow:
 * Frontend LogicPanel → FormRuleRequestDTO.actions → serialised to JSON
 * → stored in FormVersion.rules
 * → deserialized at submission time into dto.internal.RuleActionDTO
 * → executed by RuleEngineService
 *
 * Fields:
 * - {@code type} — the action to perform (SHOW, HIDE, REQUIRE,
 * VALIDATION_ERROR, SEND_EMAIL).
 * - {@code targetField} — SQL column name of the field to act on (for
 * SHOW/HIDE/REQUIRE).
 * - {@code message} — custom error text (for VALIDATION_ERROR) or the
 * email address recipient (for SEND_EMAIL).
 */
@Data
public class RuleActionRequestDTO {
    @NotNull(message = "Action type is required")
    private ActionType type;

    private String targetField;
    private String message;
}
