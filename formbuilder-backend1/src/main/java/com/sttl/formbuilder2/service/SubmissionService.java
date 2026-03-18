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

    @Transactional
    public UUID submitData(Long formId, Map<String, Object> data, String status) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormVersion latestVersion = form.getVersions().stream()
                .max(Comparator.comparingInt(FormVersion::getVersionNumber))
                .orElseThrow(() -> new RuntimeException("No versions found"));

        List<FormField> activeFields = latestVersion.getFields();

        // 1. Run Rule Validation
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

        // 2. Perform Calculations
        calculationService.recalculateCalculatedFields(data, activeFields);

        // 3. Prepare Metadata
        UUID submissionId = UUID.randomUUID();
        data.put("submission_id", submissionId);
        data.put("submitted_at", LocalDateTime.now());
        data.put("updated_at", LocalDateTime.now());
        data.put("submission_status", status != null ? status : "SUBMITTED");

        // 4. Save to DB
        dynamicTableService.insertData(form.getTargetTableName(), data);
        return submissionId;
    }

    @Transactional
    public UUID submitDataByToken(String token, Map<String, Object> data, String status) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid share token"));
        
        if (form.getStatus() != com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Submission failed: Form is not published.");
        }
        
        return submitData(form.getId(), data, status);
    }

    public Map<String, Object> getSubmissions(Long formId, int page, int size, String sortBy, String sortOrder, Map<String, String> filters) {
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

        calculationService.recalculateCalculatedFields(data, latestVersion.getFields());

        data.put("updated_at", LocalDateTime.now());
        if (status != null) data.put("submission_status", status);

        dynamicTableService.updateData(form.getTargetTableName(), submissionId, data);
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
}