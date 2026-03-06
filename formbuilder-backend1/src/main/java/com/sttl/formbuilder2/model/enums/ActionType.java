package com.sttl.formbuilder2.model.enums;

/**
 * ActionType — The Effect a Logic Rule Can Trigger
 *
 * When a rule's condition is met, one of these actions is executed by
 * {@code RuleEngineService}:
 *
 * SHOW — (Currently a frontend-only hint) Show a hidden field.
 * HIDE — (Currently a frontend-only hint) Hide a visible field.
 * REQUIRE — Server-side: enforce that the target field is not blank;
 * throws HTTP 400 if missing.
 * VALIDATION_ERROR — Server-side: reject the submission with a custom error
 * message stored in {@code RuleActionDTO.message}.
 * SEND_EMAIL — Server-side post-submission workflow: logs/sends an email
 * to the address in {@code RuleActionDTO.message}.
 * (Email delivery is simulated via System.out in dev mode.)
 */
public enum ActionType {
    SHOW,
    HIDE,
    REQUIRE,
    VALIDATION_ERROR,
    SEND_EMAIL,
}