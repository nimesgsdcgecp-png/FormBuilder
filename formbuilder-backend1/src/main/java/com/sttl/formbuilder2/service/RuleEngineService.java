package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.FormRuleDTO;
import com.sttl.formbuilder2.dto.RuleConditionDTO;
import com.sttl.formbuilder2.dto.RuleActionDTO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class RuleEngineService {

    public void validateSubmission(List<FormRuleDTO> rules, Map<String, Object> answers) {
        if (rules == null || rules.isEmpty()) return;

        for (FormRuleDTO rule : rules) {
            RuleConditionDTO condition = rule.getConditions().get(0);

            // 1. Evaluate the condition safely
            boolean isMatch = evaluateCondition(condition, answers);

            // 2. If the rule is triggered, enforce the actions!
            if (isMatch) {
                for (RuleActionDTO action : rule.getActions()) {

                    if ("VALIDATION_ERROR".equals(action.getType().name())) {
                        // Throws a clean 400 BAD REQUEST to the API consumer
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, action.getMessage());
                    }

                    else if ("REQUIRE".equals(action.getType().name())) {
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

    // Runs AFTER the database save is successful
    public void executePostSubmissionWorkflows(List<FormRuleDTO> rules, Map<String, Object> answers) {
        if (rules == null || rules.isEmpty()) return;

        for (FormRuleDTO rule : rules) {
            RuleConditionDTO condition = rule.getConditions().get(0);

            // Check if the condition is met
            if (evaluateCondition(condition, answers)) {
                for (RuleActionDTO action : rule.getActions()) {

                    if ("SEND_EMAIL".equals(action.getType().name())) {
                        String emailAddress = action.getMessage();

                        // NOTE: In a production app, you would inject JavaMailSender here.
                        // For now, we will simulate the email being sent in the console!
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

    private boolean evaluateCondition(RuleConditionDTO condition, Map<String, Object> answers) {
        Object userAnswerObj = answers.get(condition.getField());
        if (userAnswerObj == null || userAnswerObj.toString().trim().isEmpty()) {
            return false;
        }

        // Convert both to lowercase strings for baseline comparison
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
            // If they used < or > on text (like "Apple" > "Banana"), it safely fails the condition
            return false;
        }
    }
}