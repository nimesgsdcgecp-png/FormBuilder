package com.sttl.formbuilder2.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;


/**
 * FormRuleRequestDTO — Represents a Single Logic Rule in a Form Request
 *
 * What it does:
 * Carries a complete IF→THEN logic rule as part of the create/update payload
 * sent
 * by the frontend builder's Logic Panel. Multiple rules are included in
 * {@link CreateFormRequestDTO#rules} and {@link UpdateFormRequestDTO#rules}.
 *
 * Application flow:
 * Frontend LogicPanel → POST/PUT /api/forms
 * └── List<FormRuleRequestDTO> → FormService → serialised as JSON →
 * FormVersion.rules (TEXT column)
 * └── At submission time: SubmissionService deserialises →
 * dto.internal.FormRuleDTO → RuleEngineService
 *
 * Design note:
 * This DTO is the API-facing representation. At submission time the rules JSON
 * string is deserialized into {@code dto.internal.FormRuleDTO} (not this
 * class).
 */
@Data
public class FormRuleRequestDTO {
    private String id;
    @NotBlank(message = "Rule name is required")
    private String name;
    private String conditionLogic;
    @Valid
    private List<RuleConditionRequestDTO> conditions;
    @Valid
    private List<RuleActionRequestDTO> actions;
}
