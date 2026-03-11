package com.sttl.formbuilder2.dto.internal;

import com.sttl.formbuilder2.model.enums.ConditionLogic;
import lombok.Data;
import java.util.List;

/**
 * FormRuleDTO — Internal Rule Representation for the Rule Engine
 *
 * What it does:
 * Used exclusively by {@code SubmissionService} and {@code RuleEngineService}
 * to deserialize the JSON rules string stored in
 * {@link com.sttl.formbuilder2.model.entity.FormVersion#rules} into Java
 * objects
 * at submission time.
 *
 * Why it's in {@code dto.internal} (not {@code dto.request}):
 * The request-facing equivalent is
 * {@link com.sttl.formbuilder2.dto.request.FormRuleRequestDTO}
 * which is used when the builder saves a form. This DTO is used ONLY for
 * reading
 * rules back from the database — never for accepting HTTP input directly.
 *
 * Application flow:
 * FormVersion.rules (JSON TEXT in DB)
 * → ObjectMapper.readValue(rules, List<FormRuleDTO>) in SubmissionService
 * → RuleEngineService.validateSubmission(rules, answers)
 * → RuleEngineService.executePostSubmissionWorkflows(rules, answers)
 */
@Data
public class FormRuleDTO {
    private String id;
    private String name;
    private ConditionLogic conditionLogic;
    private List<RuleConditionEntryDTO> conditions;
    private List<RuleActionDTO> actions;
}
