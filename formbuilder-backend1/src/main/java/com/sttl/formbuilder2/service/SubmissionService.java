package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.FormRuleDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final FormRepository formRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper; // <--- 1. INJECT OBJECT MAPPER
    private final RuleEngineService ruleEngineService;

    @Transactional
    public UUID submitData(Long formId, Map<String, Object> submissionData) {
        // 1. Fetch Form Metadata
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormVersion activeVersion = form.getVersions().get(0);

        // --- RULE ENGINE BLOCK ---
        if (activeVersion.getRules() != null && !activeVersion.getRules().equals("[]")) {
            try {
                List<FormRuleDTO> rules = objectMapper.readValue(
                        activeVersion.getRules(),
                        new TypeReference<List<FormRuleDTO>>() {}
                );

                // Fire the Engine!
                ruleEngineService.validateSubmission(rules, submissionData);
                ruleEngineService.executePostSubmissionWorkflows(rules, submissionData);
            } catch (ResponseStatusException e) {
                // LET THIS ONE PASS THROUGH TO BLOCK THE SAVE!
                throw e;
            } catch (Exception e) {
                // Only swallow JSON parsing errors, not validation rules
                System.err.println("Failed to parse rules from DB: " + e.getMessage());
            }
        }
        // -------------------------

        String tableName = form.getTargetTableName();

        StringBuilder sql = new StringBuilder("INSERT INTO " + tableName + " (");
        StringBuilder placeholders = new StringBuilder(" VALUES ("); // Fixed typo in spacing
        List<Object> arguments = new ArrayList<>();

        boolean hasData = false; // flag to track if we added any columns

        // 3. Loop through defined fields
        for (FormField field : activeVersion.getFields()) {
            String colName = field.getColumnName();

            if (submissionData.containsKey(colName)) {
                sql.append(colName).append(", ");
                placeholders.append("?, ");

                Object rawValue = submissionData.get(colName);

                // --- FIX: Convert List/Array to JSON String ---
                if (rawValue instanceof List || rawValue instanceof Map || rawValue instanceof Object[]) {
                    try {
                        arguments.add(objectMapper.writeValueAsString(rawValue));
                    } catch (Exception e) {
                        arguments.add("[]"); // Fallback if conversion fails
                    }
                } else {
                    arguments.add(rawValue);
                }
                // ----------------------------------------------

                hasData = true;

            } else if (field.getIsMandatory()) {
                throw new RuntimeException("Missing required field: " + field.getFieldLabel());
            }
        }

        if (!hasData) {
            throw new RuntimeException("No data provided to submit!");
        }

        // 4. Clean up trailing commas
        sql.setLength(sql.length() - 2);         // Remove last ", "
        placeholders.setLength(placeholders.length() - 2); // Remove last ", "

        sql.append(")").append(placeholders).append(") RETURNING submission_id");


        // 5. Execute
        return jdbcTemplate.queryForObject(sql.toString(), UUID.class, arguments.toArray());
    }

    public List<Map<String, Object>> getSubmissions(Long formId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        String tableName = form.getTargetTableName();
        String sql = "SELECT * FROM " + tableName + " ORDER BY submitted_at DESC";

        return jdbcTemplate.queryForList(sql);
    }

    @Transactional
    public void deleteSubmission(Long formId, UUID submissionId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        String tableName = form.getTargetTableName();
        String sql = "DELETE FROM " + tableName + " WHERE submission_id = ?";

        jdbcTemplate.update(sql, submissionId);
    }


    // 1. Fetch a single submission
    public Map<String, Object> getSubmissionById(Long formId, UUID submissionId) {
        Form form = formRepository.findById(formId).orElseThrow(() -> new RuntimeException("Form not found"));
        String tableName = form.getTargetTableName();
        String sql = "SELECT * FROM " + tableName + " WHERE submission_id = ?";
        return jdbcTemplate.queryForMap(sql, submissionId);
    }

    // 2. Update a submission
    @Transactional
    public void updateSubmission(Long formId, UUID submissionId, Map<String, Object> submissionData) {
        Form form = formRepository.findById(formId).orElseThrow(() -> new RuntimeException("Form not found"));
        FormVersion activeVersion = form.getVersions().get(0);
        String tableName = form.getTargetTableName();

        StringBuilder sql = new StringBuilder("UPDATE " + tableName + " SET ");
        List<Object> arguments = new ArrayList<>();

        for (FormField field : activeVersion.getFields()) {
            String colName = field.getColumnName();
            if (submissionData.containsKey(colName)) {
                sql.append(colName).append(" = ?, ");
                Object rawValue = submissionData.get(colName);

                // Handle JSON conversion for arrays/objects (like Checkboxes/Grids)
                if (rawValue instanceof List || rawValue instanceof Map || rawValue instanceof Object[]) {
                    try {
                        arguments.add(objectMapper.writeValueAsString(rawValue));
                    } catch (Exception e) {
                        arguments.add("[]");
                    }
                } else {
                    arguments.add(rawValue);
                }
            }
        }

        if (arguments.isEmpty()) throw new RuntimeException("No data provided to update!");

        // Remove trailing ", "
        sql.setLength(sql.length() - 2);
        sql.append(" WHERE submission_id = ?");
        arguments.add(submissionId);

        jdbcTemplate.update(sql.toString(), arguments.toArray());
    }

    @Transactional
    public UUID submitDataByToken(String token, Map<String, Object> submissionData) {
        // 1. Resolve the Token to a Form ID
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // 2. Reuse your existing robust submission logic!
        return submitData(form.getId(), submissionData);
    }
}