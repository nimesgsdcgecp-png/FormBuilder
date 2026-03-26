package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.internal.FormRuleDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * SubmissionService — Business Logic for handling form submissions (Refactored)
 */
@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final FormRepository formRepository;
    private final DynamicTableService dynamicTableService;
    private final RuleEngineService ruleEngineService;
    private final CalculationService calculationService;
    private final ObjectMapper objectMapper;
    private final com.sttl.formbuilder2.repository.FormVersionRepository formVersionRepository;
    private final com.sttl.formbuilder2.repository.FieldValidationRepository fieldValidationRepository;
    private final ExpressionEvaluatorService expressionEvaluatorService;
    private final com.sttl.formbuilder2.repository.FormSubmissionMetaRepository formSubmissionMetaRepository;

    private String getCurrentUsername() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "Anonymous";
    }

    @Transactional
    public UUID submitData(Long formId, Map<String, Object> data, Long formVersionId, String status) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        if (form.getStatus() != com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Submission failed: Form is not published.");
        }

        FormVersion activeVersion = formVersionRepository.findByFormIdAndIsActiveTrue(formId)
            .orElseThrow(() -> new com.sttl.formbuilder2.exception.FormBuilderException("FORM_NOT_FOUND", "No active version found for this form"));

        // Version Consistency Check
        if (formVersionId != null && !activeVersion.getId().equals(formVersionId)) {
            throw new com.sttl.formbuilder2.exception.FormBuilderException("VERSION_MISMATCH", 
                "The form version has changed. Please refresh the page and try again.");
        }

        // Use the active version for everything below
        FormVersion latestVersion = activeVersion; 

        // Validate submission payload version id matches latest active if provided
        if (data.containsKey("formVersionId")) {
            try {
                Long payloadVersionId = Long.valueOf(data.get("formVersionId").toString());
                if (!latestVersion.getId().equals(payloadVersionId)) {
                    throw new com.sttl.formbuilder2.exception.FormBuilderException("VERSION_MISMATCH", "Form version has changed, please refresh the form.");
                }
            } catch (NumberFormatException ignored) {}
        }

        List<FormField> activeFields = latestVersion.getFields();

        // 1. Run Evaluator Validations
        java.util.List<com.sttl.formbuilder2.model.entity.FieldValidation> validations = fieldValidationRepository
            .findByFormVersionIdOrderByExecutionOrder(latestVersion.getId());

        java.util.List<com.sttl.formbuilder2.model.entity.FieldValidation> fieldValidations = validations.stream()
            .filter(v -> "FIELD".equals(v.getScope())).collect(Collectors.toList());
        java.util.List<com.sttl.formbuilder2.model.entity.FieldValidation> formValidations = validations.stream()
            .filter(v -> "FORM".equals(v.getScope())).collect(Collectors.toList());

        List<Map<String,String>> errors = new ArrayList<>();
        
        // 1a. Native JSON Validations (required, min, max, minLength, maxLength, pattern)
        if (!"RESPONSE_DRAFT".equals(status)) {
            for (FormField field : activeFields) {
                Object val = data.get(field.getColumnName());
                boolean isBlank = (val == null || val.toString().trim().isEmpty());
                
                if (Boolean.TRUE.equals(field.getIsMandatory()) && isBlank) {
                    errors.add(Map.of("fieldKey", field.getColumnName(), "message", field.getFieldLabel() + " is required."));
                }
                
                if (!isBlank && field.getValidationRules() != null) {
                    Map<String, Object> vr = field.getValidationRules();
                    String strVal = val.toString();
                    
                    try {
                        if (vr.containsKey("min") && vr.get("min") != null) {
                            double min = Double.parseDouble(vr.get("min").toString());
                            if (Double.parseDouble(strVal) < min) errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Must be >= " + min));
                        }
                        if (vr.containsKey("max") && vr.get("max") != null) {
                            double max = Double.parseDouble(vr.get("max").toString());
                            if (Double.parseDouble(strVal) > max) errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Must be <= " + max));
                        }
                    } catch(NumberFormatException ignored) {}
                    
                    if (vr.containsKey("minLength") && vr.get("minLength") != null) {
                        int minL = Integer.parseInt(vr.get("minLength").toString());
                        if (strVal.length() < minL) errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Minimum length is " + minL));
                    }
                    if (vr.containsKey("maxLength") && vr.get("maxLength") != null) {
                        int maxL = Integer.parseInt(vr.get("maxLength").toString());
                        if (strVal.length() > maxL) errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Maximum length is " + maxL));
                    }
                    if (vr.containsKey("pattern") && vr.get("pattern") != null) {
                        String pat = vr.get("pattern").toString();
                        if (!strVal.matches(pat)) errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Invalid format"));
                    }
                }


            // 1b. AST Evaluator Validations (Field Scope)
            for (com.sttl.formbuilder2.model.entity.FieldValidation fv : fieldValidations) {
                boolean passed;
                try {
                    passed = expressionEvaluatorService.evaluate(fv.getExpression(), data);
                } catch (com.sttl.formbuilder2.exception.ExpressionEvaluationException e) {
                    throw new com.sttl.formbuilder2.exception.FormBuilderException("EXPRESSION_PARSE_ERROR",
                        "Invalid expression for field: " + fv.getFieldKey(), e);
                }
                if (!passed) {
                    errors.add(Map.of("fieldKey", fv.getFieldKey(), "message", fv.getErrorMessage()));
                }
            }
    
            if (errors.isEmpty()) {
                for (com.sttl.formbuilder2.model.entity.FieldValidation fv : formValidations) {
                    boolean passed = expressionEvaluatorService.evaluate(fv.getExpression(), data);
                    if (!passed) {
                        errors.add(Map.of("fieldKey", "", "message", fv.getErrorMessage()));
                    }
                }
            }
    
            if (!errors.isEmpty()) {
                throw new com.sttl.formbuilder2.exception.ValidationFailedException("VALIDATION_ERROR", "Form validation failed", errors);
            }
    
            // 1b. Run legacy IF-THEN Actions (RuleEngineService)
            if (latestVersion.getRules() != null && !latestVersion.getRules().isBlank()) {
                try {
                    com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(latestVersion.getRules());
                    List<FormRuleDTO> rules;
                    if (rootNode.isArray()) {
                        rules = objectMapper.convertValue(rootNode, new TypeReference<List<FormRuleDTO>>() {});
                    } else if (rootNode.isObject() && rootNode.has("rules")) {
                        rules = objectMapper.convertValue(rootNode.get("rules"), new TypeReference<List<FormRuleDTO>>() {});
                    } else {
                        rules = new ArrayList<>();
                    }
                    ruleEngineService.validateSubmission(rules, data);
                } catch (org.springframework.web.server.ResponseStatusException e) {
                    throw e; // Re-throw validation errors
                } catch (Exception e) {
                    System.err.println(">>> Rule Deserialization Error: " + e.getMessage());
                }
                }
            }
        }

        // 2. Perform Calculations
        calculationService.recalculateCalculatedFields(data, activeFields);

        // 3. Prepare Metadata
        UUID submissionId = UUID.randomUUID();
        data.put("submission_id", submissionId);
        data.put("submitted_at", LocalDateTime.now());
        data.put("updated_at", LocalDateTime.now());
        data.put("submission_status", status != null ? status : "SUBMITTED");
        
        // Required Dynamic DB System Columns added for Phase 5 compliance
        data.put("form_version_id", latestVersion.getId());
        data.put("is_draft", "RESPONSE_DRAFT".equals(status));
        data.put("submitted_by", getCurrentUsername());
        // 4. Save to DB
        dynamicTableService.validateNoSchemaDrift(form);
        dynamicTableService.insertData(form.getTargetTableName(), data);

        // 5. Save metadata
        com.sttl.formbuilder2.model.entity.FormSubmissionMeta meta = com.sttl.formbuilder2.model.entity.FormSubmissionMeta.builder()
            .formId(form.getId())
            .formVersionId(latestVersion.getId())
            .submissionTable(form.getTargetTableName())
            .submissionRowId(submissionId)
            .status(status != null ? status : "SUBMITTED")
            .submittedBy(getCurrentUsername())
            .submittedAt(java.time.Instant.now())
            .build();
        formSubmissionMetaRepository.save(meta);
        
        return submissionId;
    }

    @Transactional
    public UUID submitDataByToken(String token, Map<String, Object> data, Long formVersionId, String status) {
        Form form = formRepository.findByPublicShareToken(token)
                .or(() -> formRepository.findByCode(token))
                .orElseThrow(() -> new com.sttl.formbuilder2.exception.FormBuilderException("FORM_NOT_FOUND", "Invalid share token or form code"));

        if (form.getStatus() != com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            boolean isOwner = form.getOwner() != null && form.getOwner().getUsername().equals(getCurrentUsername());
            if (!isOwner) {
                throw new com.sttl.formbuilder2.exception.FormBuilderException("FORBIDDEN", "Submission failed: Form is not published.");
            }
        }

        return submitData(form.getId(), data, formVersionId, status);
    }

    public Map<String, Object> getSubmissions(Long formId, int page, int size, String sortBy, String sortOrder,
            Map<String, String> filters) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        return dynamicTableService.fetchData(form.getTargetTableName(), page, size, sortBy, sortOrder, filters);
    }

    public Map<String, Object> getSubmissionById(Long formId, UUID submissionId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        return dynamicTableService.fetchRowById(form.getTargetTableName(), submissionId);
    }

    public Map<String, Object> getSubmissionByToken(String token, UUID submissionId) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid share token"));
        return getSubmissionById(form.getId(), submissionId);
    }

    @Transactional
    public UUID updateSubmission(Long formId, UUID submissionId, Map<String, Object> data, String status) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormVersion latestVersion = form.getVersions().stream()
                .max(Comparator.comparingInt(FormVersion::getVersionNumber))
                .orElseThrow(() -> new RuntimeException("No versions found"));

        validateSubmissionData(latestVersion, data, status);

        calculationService.recalculateCalculatedFields(data, latestVersion.getFields());

        data.put("updated_at", LocalDateTime.now());
        data.put("is_draft", "RESPONSE_DRAFT".equals(status));
        if (status != null)
            data.put("submission_status", status);

        dynamicTableService.validateNoSchemaDrift(form);
        dynamicTableService.updateData(form.getTargetTableName(), submissionId, data);

        com.sttl.formbuilder2.model.entity.FormSubmissionMeta meta = formSubmissionMetaRepository
                .findBySubmissionRowId(submissionId)
                .orElseGet(() -> {
                    com.sttl.formbuilder2.model.entity.FormSubmissionMeta m = new com.sttl.formbuilder2.model.entity.FormSubmissionMeta();
                    m.setFormId(form.getId());
                    m.setFormVersionId(latestVersion.getId());
                    m.setSubmissionTable(form.getTargetTableName());
                    m.setSubmissionRowId(submissionId);
                    m.setSubmittedBy(getCurrentUsername());
                    return m;
                });

        meta.setStatus(status != null ? status : "SUBMITTED");
        meta.setSubmittedAt(java.time.Instant.now());
        formSubmissionMetaRepository.save(meta);

        return submissionId;
    }

    @Transactional
    public UUID updateSubmissionByToken(String token, UUID submissionId, Map<String, Object> data, String status) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid share token"));
        return updateSubmission(form.getId(), submissionId, data, status);
    }

    @Transactional
    public void deleteSubmission(Long formId, UUID submissionId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        dynamicTableService.deleteRow(form.getTargetTableName(), submissionId);
    }

    @Transactional
    public void deleteSubmissionsBulk(Long formId, List<UUID> submissionIds) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        dynamicTableService.deleteRowsBulk(form.getTargetTableName(), submissionIds);
    }

    /**
     * SRS Bulk Operation: Update status for multiple submissions
     */
    @Transactional
    public void updateSubmissionStatusBulk(Long formId, List<UUID> submissionIds, String newStatus) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        dynamicTableService.updateStatusBulk(form.getTargetTableName(), submissionIds, newStatus);

        // Also update metadata table
        for (UUID id : submissionIds) {
            formSubmissionMetaRepository.findBySubmissionRowId(id).ifPresent(meta -> {
                meta.setStatus(newStatus);
                formSubmissionMetaRepository.save(meta);
            });
        }
    }

    public String exportSubmissionsToCsv(Long formId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new com.sttl.formbuilder2.exception.FormBuilderException("FORM_NOT_FOUND",
                        "Form not found"));

        List<String> columns = dynamicTableService.getTableColumns(form.getTargetTableName());
        List<Map<String, Object>> data = dynamicTableService.fetchAllData(form.getTargetTableName());

        StringBuilder csv = new StringBuilder();
        csv.append(String.join(",", columns)).append("\n");
        for (Map<String, Object> row : data) {
            List<String> rowValues = new ArrayList<>();
            for (String col : columns) {
                Object val = row.get(col);
                String strVal = val == null ? "" : val.toString().replace("\"", "\"\"");
                if (strVal.startsWith("=") || strVal.startsWith("+") || strVal.startsWith("-") || strVal.startsWith("@")) {
                    strVal = "'" + strVal;
                }
                rowValues.add("\"" + strVal + "\"");
            }
            csv.append(String.join(",", rowValues)).append("\n");
        }
        return csv.toString();
    }

    private void validateSubmissionData(FormVersion latestVersion, Map<String, Object> data, String status) {
        if ("RESPONSE_DRAFT".equals(status)) {
            return;
        }

        List<FormField> activeFields = latestVersion.getFields();
        List<Map<String, String>> errors = new ArrayList<>();

        // 1a. Native JSON Validations (required, min, max, minLength, maxLength, pattern)
        for (FormField field : activeFields) {
            Object val = data.get(field.getColumnName());
            boolean isBlank = (val == null || val.toString().trim().isEmpty());

            if (Boolean.TRUE.equals(field.getIsMandatory()) && isBlank) {
                errors.add(Map.of("fieldKey", field.getColumnName(), "message", field.getFieldLabel() + " is required."));
            }

            if (!isBlank && field.getValidationRules() != null) {
                Map<String, Object> vr = field.getValidationRules();
                String strVal = val.toString();

                try {
                    if (vr.containsKey("min") && vr.get("min") != null) {
                        double min = Double.parseDouble(vr.get("min").toString());
                        if (Double.parseDouble(strVal) < min)
                            errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Must be >= " + min));
                    }
                    if (vr.containsKey("max") && vr.get("max") != null) {
                        double max = Double.parseDouble(vr.get("max").toString());
                        if (Double.parseDouble(strVal) > max)
                            errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Must be <= " + max));
                    }
                } catch (NumberFormatException ignored) {}

                if (vr.containsKey("minLength") && vr.get("minLength") != null) {
                    int minL = Integer.parseInt(vr.get("minLength").toString());
                    if (strVal.length() < minL)
                        errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Minimum length is " + minL));
                }
                if (vr.containsKey("maxLength") && vr.get("maxLength") != null) {
                    int maxL = Integer.parseInt(vr.get("maxLength").toString());
                    if (strVal.length() > maxL)
                        errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Maximum length is " + maxL));
                }
                if (vr.containsKey("pattern") && vr.get("pattern") != null) {
                    String pat = vr.get("pattern").toString();
                    if (!strVal.matches(pat))
                        errors.add(Map.of("fieldKey", field.getColumnName(), "message", "Invalid format"));
                }
            }
        }

        // 1b. AST Evaluator Validations
        java.util.List<com.sttl.formbuilder2.model.entity.FieldValidation> validations = fieldValidationRepository
                .findByFormVersionIdOrderByExecutionOrder(latestVersion.getId());

        java.util.List<com.sttl.formbuilder2.model.entity.FieldValidation> fieldValidations = validations.stream()
                .filter(v -> "FIELD".equals(v.getScope())).collect(Collectors.toList());
        java.util.List<com.sttl.formbuilder2.model.entity.FieldValidation> formValidations = validations.stream()
                .filter(v -> "FORM".equals(v.getScope())).collect(Collectors.toList());

        for (com.sttl.formbuilder2.model.entity.FieldValidation fv : fieldValidations) {
            boolean passed;
            try {
                passed = expressionEvaluatorService.evaluate(fv.getExpression(), data);
            } catch (com.sttl.formbuilder2.exception.ExpressionEvaluationException e) {
                throw new com.sttl.formbuilder2.exception.FormBuilderException("EXPRESSION_PARSE_ERROR",
                        "Invalid expression for field: " + fv.getFieldKey(), e);
            }
            if (!passed) {
                errors.add(Map.of("fieldKey", fv.getFieldKey(), "message", fv.getErrorMessage()));
            }
        }

        if (errors.isEmpty()) {
            for (com.sttl.formbuilder2.model.entity.FieldValidation fv : formValidations) {
                boolean passed = expressionEvaluatorService.evaluate(fv.getExpression(), data);
                if (!passed) {
                    errors.add(Map.of("fieldKey", "", "message", fv.getErrorMessage()));
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new com.sttl.formbuilder2.exception.ValidationFailedException("VALIDATION_ERROR", "Form validation failed", errors);
        }

        // 1c. Run legacy IF-THEN Actions (RuleEngineService)
        if (latestVersion.getRules() != null && !latestVersion.getRules().isBlank()) {
            try {
                com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(latestVersion.getRules());
                List<FormRuleDTO> rules;
                if (rootNode.isArray()) {
                    rules = objectMapper.convertValue(rootNode, new com.fasterxml.jackson.core.type.TypeReference<List<FormRuleDTO>>() {});
                } else if (rootNode.isObject() && rootNode.has("rules")) {
                    rules = objectMapper.convertValue(rootNode.get("rules"), new com.fasterxml.jackson.core.type.TypeReference<List<FormRuleDTO>>() {});
                } else {
                    rules = new ArrayList<>();
                }
                ruleEngineService.validateSubmission(rules, data);
            } catch (org.springframework.web.server.ResponseStatusException e) {
                throw e; // Re-throw validation errors
            } catch (Exception e) {
                System.err.println(">>> Rule Deserialization Error: " + e.getMessage());
            }
        }
    }
}