package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.internal.FormRuleDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * SubmissionService — Business Logic for Form Submissions
 *
 * What it does:
 * Handles the full lifecycle of a form submission: inserting, reading,
 * updating,
 * and deleting rows in the dynamic submission tables managed by
 * {@code DynamicTableService}. Also integrates the rule engine before inserting
 * new submissions.
 *
 * Key design decisions:
 * - Uses {@code JdbcTemplate} directly (not JPA) because the submission tables
 * have dynamic schemas that vary per form — JPA requires compile-time entity
 * definitions, which is incompatible with runtime DDL.
 * - The rule engine is invoked BEFORE the INSERT. Validation errors from the
 * engine
 * throw a {@code ResponseStatusException} (HTTP 400) which propagates up and
 * prevents the data from being saved.
 * - Complex values (lists, maps from multi-select / grid fields) are serialised
 * to JSON strings via Jackson's {@code ObjectMapper} before insertion, since
 * submission table columns are all simple SQL types.
 *
 * Dependencies:
 * - {@code FormRepository} — to load form metadata (table name, field
 * definitions).
 * - {@code JdbcTemplate} — for raw SQL DML against dynamic submission tables.
 * - {@code ObjectMapper} — for deserialising stored rules JSON and serialising
 * complex field values (e.g. checkbox arrays).
 * - {@code RuleEngineService} — validates and executes post-submission
 * workflows.
 */
@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final FormRepository formRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper; // For rule JSON deserialisation and complex value serialisation
    private final RuleEngineService ruleEngineService;
    private final UserRepository userRepository;

    private AppUser getCurrentUser() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            return userRepository.findByUsername(username).orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isOwner(Form form) {
        AppUser user = getCurrentUser();
        return user != null && form.getOwner() != null && form.getOwner().getId().equals(user.getId());
    }

    /**
     * Inserts a new submission row into the form's dynamic submission table.
     *
     * Steps:
     * 1. Load the form and its active version (index 0 = latest published version).
     * 2. If the version has logic rules, deserialise them and run the rule engine:
     * - {@code validateSubmission} throws HTTP 400 if a REQUIRE or VALIDATION_ERROR
     * action is triggered, blocking the save.
     * - {@code executePostSubmissionWorkflows} runs AFTER the (eventual) save
     * trigger (e.g. SEND_EMAIL).
     * 3. Build the INSERT SQL dynamically using only the columns defined in the
     * current form version. Unknown keys in {@code submissionData} are ignored.
     * 4. Serialise complex values (List/Map from checkboxes/grids) to JSON strings.
     * 5. Execute INSERT … RETURNING submission_id to get the generated UUID.
     *
     * @param formId         The internal form ID.
     * @param submissionData Map of {columnName: value} pairs from the respondent.
     * @return The UUID of the newly created submission row.
     */
    @Transactional
    public UUID submitData(Long formId, Map<String, Object> submissionData) {
        // 1. Fetch Form Metadata
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormVersion activeVersion = form.getVersions().get(0);

        // 2. Fire the Rule Engine before saving
        if (activeVersion.getRules() != null && !activeVersion.getRules().equals("[]")) {
            try {
                Object rawRules = objectMapper.readValue(activeVersion.getRules(), Object.class);
                List<FormRuleDTO> rules;
                if (rawRules instanceof Map) {
                    Map<String, Object> rulesMap = (Map<String, Object>) rawRules;
                    rules = objectMapper.convertValue(rulesMap.get("logic"), new TypeReference<List<FormRuleDTO>>() {
                    });
                } else {
                    rules = objectMapper.convertValue(rawRules, new TypeReference<List<FormRuleDTO>>() {
                    });
                }

                // Validate — throws HTTP 400 on REQUIRE / VALIDATION_ERROR violations
                ruleEngineService.validateSubmission(rules, submissionData);
                // Post-submission workflows (e.g. SEND_EMAIL) — only reached if validation
                // passed
                ruleEngineService.executePostSubmissionWorkflows(rules, submissionData);
            } catch (ResponseStatusException e) {
                // Let validation errors propagate to block the save
                throw e;
            } catch (Exception e) {
                // Only swallow JSON parsing failures, not rule violations
                System.err.println("Failed to parse rules from DB: " + e.getMessage());
            }
        }

        String tableName = form.getTargetTableName();

        StringBuilder sql = new StringBuilder("INSERT INTO " + tableName + " (");
        StringBuilder placeholders = new StringBuilder(" VALUES (");
        List<Object> arguments = new ArrayList<>();

        boolean hasData = false;

        // 3. Loop through defined fields and build the INSERT statement
        for (FormField field : activeVersion.getFields()) {
            String colName = field.getColumnName();

            if (submissionData.containsKey(colName)) {
                sql.append(colName).append(", ");
                placeholders.append("?, ");

                Object rawValue = submissionData.get(colName);

                // 4. Serialise List/Map/Array values (multi-select, grid) to a JSON string
                if (rawValue instanceof List || rawValue instanceof Map || rawValue instanceof Object[]) {
                    try {
                        arguments.add(objectMapper.writeValueAsString(rawValue));
                    } catch (Exception e) {
                        arguments.add("[]"); // Fallback if conversion fails
                    }
                } else {
                    arguments.add(rawValue);
                }

                hasData = true;

            } else if (field.getIsMandatory()) {
                throw new RuntimeException("Missing required field: " + field.getFieldLabel());
            }
        }

        if (!hasData) {
            throw new RuntimeException("No data provided to submit!");
        }

        // Remove trailing comma+space from both clauses
        sql.setLength(sql.length() - 2);
        placeholders.setLength(placeholders.length() - 2);

        // 5. Execute and return the generated UUID
        sql.append(")").append(placeholders).append(") RETURNING submission_id");
        return jdbcTemplate.queryForObject(sql.toString(), UUID.class, arguments.toArray());
    }

    /**
     * Returns all submission rows for a form, ordered newest-first.
     * Used by the admin responses page to populate the data table.
     *
     * @param formId The internal form ID.
     * @return List of maps where each map is one row: {columnName → value}.
     */
    public List<Map<String, Object>> getSubmissions(Long formId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        String tableName = form.getTargetTableName();
        String sql = "SELECT * FROM " + tableName + " ORDER BY submitted_at DESC";

        return jdbcTemplate.queryForList(sql);
    }

    /**
     * Retrieves a single submission row by its UUID.
     * Used by the public form page when a respondent clicks "Edit your response"
     * to pre-fill their previous answers.
     *
     * @param formId       The internal form ID (used to resolve the table name).
     * @param submissionId The UUID of the submission to fetch.
     * @return A single row as a map: {columnName → value}.
     */
    public Map<String, Object> getSubmissionById(Long formId, UUID submissionId) {
        Form form = formRepository.findById(formId).orElseThrow(() -> new RuntimeException("Form not found"));
        String tableName = form.getTargetTableName();
        String sql = "SELECT * FROM " + tableName + " WHERE submission_id = ?";
        return jdbcTemplate.queryForMap(sql, submissionId);
    }

    /**
     * Updates an existing submission row with new values from the respondent.
     * Only columns present in the current form version are included in the UPDATE
     * statement. Complex values (arrays/objects) are serialised to JSON strings.
     *
     * @param formId         The internal form ID.
     * @param submissionId   The UUID of the submission to update.
     * @param submissionData Map of {columnName: newValue} pairs.
     */
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

                // Serialise complex values (checkboxes, grids) to JSON strings
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

        if (arguments.isEmpty())
            throw new RuntimeException("No data provided to update!");

        // Remove trailing ", " and append the WHERE clause
        sql.setLength(sql.length() - 2);
        sql.append(" WHERE submission_id = ?");
        arguments.add(submissionId);

        jdbcTemplate.update(sql.toString(), arguments.toArray());
    }

    /**
     * Hard-deletes a submission row from the dynamic table.
     * Used by the admin responses page. This action is irreversible.
     *
     * @param formId       The internal form ID.
     * @param submissionId The UUID of the row to delete.
     */
    @Transactional
    public void deleteSubmission(Long formId, UUID submissionId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        String tableName = form.getTargetTableName();
        String sql = "DELETE FROM " + tableName + " WHERE submission_id = ?";

        jdbcTemplate.update(sql, submissionId);
    }

    /**
     * Accepts a submission from a public respondent identified by their share token
     * (used by the public form page, no authentication required).
     * Resolves the token to an internal form ID and delegates to
     * {@link #submitData}.
     *
     * @param token          The UUID share token from the public URL.
     * @param submissionData Map of {columnName: value} pairs from the respondent.
     * @return The generated submission UUID.
     */
    @Transactional
    public UUID submitDataByToken(String token, Map<String, Object> submissionData) {
        // 1. Resolve the token to the internal Form
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // 2. Re-use the standard submission logic (rule engine, column mapping, etc.)
        return submitData(form.getId(), submissionData);
    }

    /**
     * Publicly retrieve a submission for editing via its form token.
     */
    public Map<String, Object> getSubmissionByToken(String token, UUID submissionId) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // Only allow fetch if editing is permitted OR the user is the owner
        if (!form.isAllowEditResponse() && !isOwner(form)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Editing is disabled for this form.");
        }

        return getSubmissionById(form.getId(), submissionId);
    }

    /**
     * Publicly update a submission for editing via its form token.
     */
    @Transactional
    public void updateSubmissionByToken(String token, UUID submissionId, Map<String, Object> submissionData) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // Validate permission: must allow edits OR be the form owner
        if (!form.isAllowEditResponse() && !isOwner(form)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Editing is disabled for this form.");
        }

        updateSubmission(form.getId(), submissionId, submissionData);
    }
}