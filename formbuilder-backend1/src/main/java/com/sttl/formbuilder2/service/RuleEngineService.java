package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.internal.FormRuleDTO;
import com.sttl.formbuilder2.dto.internal.RuleConditionDTO;
import com.sttl.formbuilder2.dto.internal.RuleActionDTO;
import com.sttl.formbuilder2.dto.internal.RuleConditionEntryDTO;
import com.sttl.formbuilder2.dto.internal.ConditionGroupDTO;
import com.sttl.formbuilder2.model.enums.ConditionLogic;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
/**
 * Server-Side Logic Rule Evaluation Engine.
 * Evaluates the IF→THEN logic rules attached to a form version when a submission
 * is received, preventing invalid inserts and triggering post-submission workflows.
 */
@Service
public class RuleEngineService {

    /**
     * Validates a submission against all rules in the form's active version.
     * Runs synchronously BEFORE the data is saved. Any triggered REQUIRE or
     * VALIDATION_ERROR action causes an immediate HTTP 400 response.
     *
     * @param rules   The deserialized list of {@link FormRuleDTO}s from
     *                {@code FormVersion.rules}.
     * @param answers Map of {columnName: value} pairs submitted by the respondent.
     * @throws ResponseStatusException HTTP 400 if a rule's action rejects the
     *                                 submission.
     */
    public void validateSubmission(List<FormRuleDTO> rules, Map<String, Object> answers) {
        if (rules == null || rules.isEmpty())
            return;

        for (FormRuleDTO rule : rules) {
            boolean isMatch = evaluateRule(rule, answers);

            if (isMatch) {
                for (RuleActionDTO action : rule.getActions()) {
                    if ("VALIDATION_ERROR".equals(action.getType().name())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, action.getMessage());
                    } else if ("REQUIRE".equals(action.getType().name())) {
                        Object targetValue = answers.get(action.getTargetField());
                        if (targetValue == null || targetValue.toString().trim().isEmpty()) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                    "Validation Error: '" + action.getTargetField() + "' is a required field.");
                        }
                    }
                }
            }
        }
    }

    /**
     * Helper to evaluate all conditions in a rule based on AND/OR logic.
     */
    private boolean evaluateRule(FormRuleDTO rule, Map<String, Object> answers) {
        List<RuleConditionEntryDTO> conditions = rule.getConditions();
        if (conditions == null || conditions.isEmpty())
            return false;

        ConditionLogic logic = rule.getConditionLogic() != null ? rule.getConditionLogic() : ConditionLogic.AND;
        return evaluateEntries(conditions, logic, answers);
    }

    private boolean evaluateEntries(List<RuleConditionEntryDTO> entries, ConditionLogic logic,
            Map<String, Object> answers) {
        if (logic == ConditionLogic.OR) {
            for (RuleConditionEntryDTO entry : entries) {
                if (evaluateEntry(entry, answers))
                    return true;
            }
            return false;
        } else {
            for (RuleConditionEntryDTO entry : entries) {
                if (!evaluateEntry(entry, answers))
                    return false;
            }
            return true;
        }
    }

    private boolean evaluateEntry(RuleConditionEntryDTO entry, Map<String, Object> answers) {
        if (entry instanceof RuleConditionDTO condition) {
            return evaluateCondition(condition, answers);
        } else if (entry instanceof ConditionGroupDTO group) {
            return evaluateEntries(group.getConditions(), group.getLogic(), answers);
        }
        return false;
    }

    /**
     * Executes post-submission workflow actions (e.g. SEND_EMAIL) AFTER the
     * database
     * save has already succeeded. Since this runs after the save, failures here do
     * NOT roll back the submission.
     *
     * Current implementation: SEND_EMAIL is simulated by printing to stdout.
     * In production, inject JavaMailSender and send a real email.
     *
     * @param rules   The deserialized list of {@link FormRuleDTO}s.
     * @param answers The respondent's submitted answers.
     */
    public void executePostSubmissionWorkflows(List<FormRuleDTO> rules, Map<String, Object> answers) {
        if (rules == null || rules.isEmpty())
            return;

        for (FormRuleDTO rule : rules) {
            if (evaluateRule(rule, answers)) {
                for (RuleActionDTO action : rule.getActions()) {
                    if ("SEND_EMAIL".equals(action.getType().name())) {
                        String emailAddress = action.getMessage();
                        System.out.println("==================================================");
                        System.out.println("🚀 WORKFLOW TRIGGERED: SEND_EMAIL");
                        System.out.println("📧 TO: " + emailAddress);
                        System.out.println("📄 BODY: New submission received -> " + answers.toString());
                        System.out.println("==================================================");
                    }
                }
            }
        }
    }

    /**
     * Evaluates a single {@link RuleConditionDTO} against the respondent's answers.
     *
     * Comparison rules:
     * - All values are trimmed and compared case-insensitively.
     * - GREATER_THAN and LESS_THAN parse both sides as doubles; non-numeric text
     * safely returns {@code false} (NumberFormatException is caught and swallowed).
     * - A missing or blank answer always returns {@code false}.
     *
     * @param condition The condition to evaluate.
     * @param answers   The full map of submitted {columnName: value} pairs.
     * @return {@code true} if the condition matches, {@code false} otherwise.
     */
    private boolean evaluateCondition(RuleConditionDTO condition, Map<String, Object> answers) {
        Object userAnswerObj = answers.get(condition.getField());
        if (userAnswerObj == null || userAnswerObj.toString().trim().isEmpty()) {
            return false;
        }

        // Normalise both sides to lowercase strings for comparison
        String userAnswer = userAnswerObj.toString().trim().toLowerCase();

        // Resolve target value: either a static value or another field's value
        String ruleValue;
        if ("FIELD".equals(condition.getValueType())) {
            Object targetFieldVal = answers.get(condition.getValue());
            if (targetFieldVal == null || targetFieldVal.toString().trim().isEmpty()) {
                return false;
            }
            ruleValue = targetFieldVal.toString().trim().toLowerCase();
        } else {
            ruleValue = condition.getValue() == null ? "" : condition.getValue().toString().trim().toLowerCase();
        }

        try {
            switch (condition.getOperator().name()) {
                case "EQUALS":
                    return userAnswer.equals(ruleValue);
                case "NOT_EQUALS":
                    return !userAnswer.equals(ruleValue);
                case "CONTAINS":
                    return userAnswer.contains(ruleValue);
                case "GREATER_THAN":
                    return Double.parseDouble(userAnswer) > Double.parseDouble(ruleValue);
                case "LESS_THAN":
                    return Double.parseDouble(userAnswer) < Double.parseDouble(ruleValue);
                default:
                    return false;
            }
        } catch (NumberFormatException e) {
            // GREATER_THAN / LESS_THAN applied to non-numeric text → condition fails safely
            return false;
        }
    }
}