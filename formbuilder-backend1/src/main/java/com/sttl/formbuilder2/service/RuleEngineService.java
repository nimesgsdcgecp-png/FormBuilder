package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.internal.FormRuleDTO;
import com.sttl.formbuilder2.dto.internal.RuleConditionDTO;
import com.sttl.formbuilder2.dto.internal.RuleActionDTO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * RuleEngineService — Server-Side Logic Rule Evaluation Engine
 *
 * What it does:
 * Evaluates the IF→THEN logic rules attached to a form version when a
 * submission
 * is received. Called by {@code SubmissionService} with the deserialized rules
 * and the respondent's answers BEFORE the data is saved to the database.
 *
 * Two-phase evaluation:
 * 1. {@link #validateSubmission} — Pre-save validation. Throws HTTP 400
 * if a REQUIRE or VALIDATION_ERROR action is triggered, preventing the INSERT.
 * 2. {@link #executePostSubmissionWorkflows} — Post-save workflows (currently
 * logs
 * SEND_EMAIL actions to stdout; replace with JavaMailSender for production).
 *
 * Condition evaluation ({@link #evaluateCondition}):
 * Currently evaluates only the FIRST condition per rule (multi-condition AND/OR
 * support is planned via {@code FormRuleDTO.conditionLogic}). Comparisons are
 * case-insensitive strings; GREATER_THAN / LESS_THAN parse values as doubles.
 *
 * Key design decision — internal DTOs:
 * Uses {@code dto.internal.*} (FormRuleDTO, RuleConditionDTO, RuleActionDTO)
 * rather
 * than the {@code dto.request.*} equivalents because these objects are
 * deserialized
 * from JSON stored in the database — they are not HTTP request bodies.
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
            RuleConditionDTO condition = rule.getConditions().get(0); // Note: currently evaluates only the first
                                                                      // condition

            boolean isMatch = evaluateCondition(condition, answers);

            if (isMatch) {
                for (RuleActionDTO action : rule.getActions()) {

                    if ("VALIDATION_ERROR".equals(action.getType().name())) {
                        // Reject submission with the builder-defined error message
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, action.getMessage());
                    }

                    else if ("REQUIRE".equals(action.getType().name())) {
                        // Enforce that the target field has a non-empty value
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
            RuleConditionDTO condition = rule.getConditions().get(0);

            if (evaluateCondition(condition, answers)) {
                for (RuleActionDTO action : rule.getActions()) {

                    if ("SEND_EMAIL".equals(action.getType().name())) {
                        String emailAddress = action.getMessage();

                        // DEV: Email is simulated in the console.
                        // TODO (production): replace with JavaMailSender.send(...)
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
        String ruleValue = condition.getValue() == null ? "" : condition.getValue().toString().trim().toLowerCase();

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