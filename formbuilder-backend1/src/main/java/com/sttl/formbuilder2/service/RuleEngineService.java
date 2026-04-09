package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.internal.FormRuleDTO;
import com.sttl.formbuilder2.dto.internal.RuleConditionDTO;
import com.sttl.formbuilder2.dto.internal.RuleActionDTO;
import com.sttl.formbuilder2.dto.internal.RuleConditionEntryDTO;
import com.sttl.formbuilder2.dto.internal.ConditionGroupDTO;
import com.sttl.formbuilder2.model.enums.ConditionLogic;
import com.sttl.formbuilder2.model.enums.ActionType;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;

/**
 * Server-Side Logic Rule Evaluation Engine.
 * Evaluates the IF→THEN logic rules attached to a form version when a submission
 * is received, preventing invalid inserts and triggering post-submission workflows.
 */
@Service
@RequiredArgsConstructor
public class RuleEngineService {

    private final AuditService auditService;
    private final JavaMailSender mailSender;

    /**
     * Validates a submission against all rules in the form's active version.
     * Runs synchronously BEFORE the data is saved. Any triggered REQUIRE or
     * VALIDATION_ERROR action causes an immediate HTTP 400 response.
     *
     * @param rules   The deserialized list of {@link FormRuleDTO}s from
     *                {@code FormVersion.rules}.
     * @param answers Map of {fieldKey: value} pairs submitted by the respondent.
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
     * @param rules   The deserialized list of {@link FormRuleDTO}s.
     * @param answers The respondent's submitted answers.
     */
    public void executePostSubmissionWorkflows(List<FormRuleDTO> rules, Map<String, Object> answers) {
        if (rules == null || rules.isEmpty())
            return;

        for (FormRuleDTO rule : rules) {
            if (evaluateRule(rule, answers)) {
                for (RuleActionDTO action : rule.getActions()) {
                    if (action.getType() == ActionType.SEND_EMAIL) {
                        String emailAddress = action.getMessage();
                        String subject = "New Form Submission Received";

                        // Create a body from the submission data
                        StringBuilder body = new StringBuilder("Data Received:\n\n");
                        answers.forEach((k, v) -> body.append(k).append(": ").append(v).append("\n"));

                        // TRIGGER REAL EMAIL (ASYNC)
                        sendRealEmail(emailAddress, subject, body.toString());
                        
                        // LOG TO AUDIT (VISIBLE IN UI)
                        try {
                            auditService.log("RULE_TRIGGERED", "SYSTEM", "FORM_RULE", action.getType().name(), 
                                "Action: SEND_EMAIL to " + emailAddress);
                        } catch (Exception e) {
                            // Non-blocking log failure
                        }
                    }
                }
            }
        }
    }

    @Async
    public void sendRealEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
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
     * @param answers   The full map of submitted {fieldKey: value} pairs.
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