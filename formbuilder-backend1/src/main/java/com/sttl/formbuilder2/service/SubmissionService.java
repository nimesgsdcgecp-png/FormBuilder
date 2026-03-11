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

import java.util.*;
import java.util.stream.Collectors;

/**
 * Handles the full lifecycle of a form submission: inserting, reading, updating,
 * and deleting rows in the dynamic submission tables.
 * Integrates the rule engine for validation before inserting new submissions.
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
     * Inserts a new submission row into the form's dynamic table.
     * Evaluates form rules before insertion. Complex values are serialized to JSON.
     *
     * @param formId         The internal form ID.
     * @param submissionData Map of respondent data.
     * @param status         Submission status (e.g., "FINAL", "DRAFT").
     * @return The UUID of the newly created submission.
     */
    @Transactional
    public UUID submitData(Long formId, Map<String, Object> submissionData, String status) {
        // 1. Fetch Form Metadata
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormVersion activeVersion = form.getVersions().get(0);

        boolean isDraft = "DRAFT".equalsIgnoreCase(status);

        // Recalculate formulas for calculated fields
        recalculateCalculatedFields(submissionData, activeVersion.getFields());

        // 2. Fire the Rule Engine before saving (Skip if DRAFT)
        if (!isDraft && activeVersion.getRules() != null && !activeVersion.getRules().equals("[]")) {
            try {
                Object rawRules = objectMapper.readValue(activeVersion.getRules(), Object.class);
                List<FormRuleDTO> rules;
                if (rawRules instanceof Map<?, ?> rulesMap) {
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

        StringBuilder sql = new StringBuilder("INSERT INTO \"" + tableName + "\" (");
        StringBuilder placeholders = new StringBuilder(" VALUES (");
        List<Object> arguments = new ArrayList<>();

        boolean hasData = false;

        // Add status column
        sql.append("submission_status, ");
        placeholders.append("?, ");
        arguments.add(status != null ? status.toUpperCase() : "FINAL");

        // 3. Loop through defined fields and build the INSERT statement
        for (FormField field : activeVersion.getFields()) {
            String colName = field.getColumnName();

            if (submissionData.containsKey(colName)) {
                sql.append("\"").append(colName).append("\", ");
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

            } else if (field.getIsMandatory() && !isDraft) {
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
     * Returns a paginated, sorted, and filtered list of submission rows.
     */
    public Map<String, Object> getSubmissions(Long id, int page, int size, String sortBy, String sortOrder, Map<String, String> filters) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        String tableName = form.getTargetTableName();
        
        // 1. Validate sortBy column to prevent SQL injection
        validateColumnName(sortBy, form);
        String direction = "DESC".equalsIgnoreCase(sortOrder) ? "DESC" : "ASC";

        // 2. Build WHERE clause from filters (Always filter out deleted)
        StringBuilder whereClause = new StringBuilder(" WHERE is_deleted = FALSE");
        List<Object> args = new ArrayList<>();
        
        if (filters != null) {
            // Handle Global Search
            String globalVal = filters.get("q");
            if (globalVal != null && !globalVal.isBlank()) {
                whereClause.append(" AND (");
                List<String> searchable = new ArrayList<>(List.of("submission_id", "submission_status"));
                searchable.addAll(form.getVersions().get(0).getFields().stream()
                        .map(FormField::getColumnName)
                        .collect(Collectors.toList()));
                
                for (int i = 0; i < searchable.size(); i++) {
                    whereClause.append("CAST(").append(searchable.get(i)).append(" AS TEXT) ILIKE ?");
                    args.add("%" + globalVal + "%");
                    if (i < searchable.size() - 1) whereClause.append(" OR ");
                }
                whereClause.append(")");
            }

            // Handle Specific Column Filters
            for (Map.Entry<String, String> entry : filters.entrySet()) {
                String col = entry.getKey();
                String val = entry.getValue();
                if ("q".equals(col)) continue;
                
                if (val != null && !val.isBlank()) {
                    validateColumnName(col, form);
                    whereClause.append(" AND CAST(").append(col).append(" AS TEXT) ILIKE ?");
                    args.add("%" + val + "%");
                }
            }
        }

        // 3. Get total count for pagination metadata
        String countSql = "SELECT COUNT(*) FROM \"" + tableName + "\"" + whereClause;
        Long total = jdbcTemplate.queryForObject(countSql, Long.class, args.toArray());
        long totalCount = (total != null) ? total : 0L;

        // 4. Fetch data with LIMIT and OFFSET
        int offset = page * size;
        String dataSql = "SELECT * FROM \"" + tableName + "\"" + whereClause + 
                         " ORDER BY \"" + sortBy + "\" " + direction + 
                         " LIMIT ? OFFSET ?";
        
        List<Object> dataArgs = new ArrayList<>(args);
        dataArgs.add(size);
        dataArgs.add(offset);
        
        List<Map<String, Object>> content = jdbcTemplate.queryForList(dataSql, dataArgs.toArray());

        return Map.of(
            "content", content,
            "totalElements", totalCount,
            "totalPages", (int) Math.ceil((double) totalCount / size),
            "size", size,
            "number", page
        );
    }

    private void validateColumnName(String columnName, Form form) {
        List<String> systemCols = List.of("submitted_at", "submission_id", "submission_status", "id");
        if (systemCols.contains(columnName)) return;

        boolean isValid = form.getVersions().get(0).getFields().stream()
                .anyMatch(f -> columnName.equals(f.getColumnName()));
        
        if (!isValid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid column name for dynamic query: " + columnName);
        }
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
        String sql = "SELECT * FROM \"" + tableName + "\" WHERE submission_id = CAST(? AS UUID) AND is_deleted = FALSE";

        try {
            return jdbcTemplate.queryForMap(sql, submissionId);
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            System.err.println("Draft not found in table " + tableName + " for ID: " + submissionId);
            return null; // Controller will handle null
        }
    }

    /**
     * Updates an existing submission row. Complex values are serialised to JSON.
     *
     * @param formId         The internal form ID.
     * @param submissionId   The UUID of the submission to update.
     * @param submissionData Updated submission data.
     * @param status         Updated submission status.
     */
    @Transactional
    public UUID updateSubmission(Long formId, UUID submissionId, Map<String, Object> submissionData, String status) {
        Form form = formRepository.findById(formId).orElseThrow(() -> new RuntimeException("Form not found"));
        FormVersion activeVersion = form.getVersions().get(0);
        String tableName = form.getTargetTableName();

        // Recalculate formulas for calculated fields
        recalculateCalculatedFields(submissionData, activeVersion.getFields());

        StringBuilder sql = new StringBuilder("UPDATE \"" + tableName + "\" SET ");
        List<Object> arguments = new ArrayList<>();

        if (status != null) {
            sql.append("submission_status = ?, ");
            arguments.add(status.toUpperCase());
        }

        for (FormField field : activeVersion.getFields()) {
            String colName = field.getColumnName();
            if (submissionData.containsKey(colName)) {
                sql.append("\"").append(colName).append("\" = ?, ");
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
        sql.append(" WHERE submission_id = CAST(? AS UUID)");
        arguments.add(submissionId);

        jdbcTemplate.update(sql.toString(), arguments.toArray());
        return submissionId;
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
        String sql = "UPDATE \"" + tableName + "\" SET is_deleted = TRUE WHERE submission_id = ?";

        jdbcTemplate.update(sql, submissionId);
    }

    /**
     * Hard-deletes multiple submission rows in a single batch.
     * Use a parameterized IN clause for performance.
     *
     * @param formId        The internal form ID.
     * @param submissionIds List of UUIDs to delete.
     */
    @Transactional
    public void deleteSubmissionsBulk(Long formId, List<UUID> submissionIds) {
        if (submissionIds == null || submissionIds.isEmpty())
            return;

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        String tableName = form.getTargetTableName();

        // Dynamically build 'IN (?, ?, ...)' placeholders
        String placeholders = String.join(",", submissionIds.stream().map(id -> "?").toList());
        String sql = "UPDATE \"" + tableName + "\" SET is_deleted = TRUE WHERE submission_id IN (" + placeholders + ")";

        jdbcTemplate.update(sql, submissionIds.toArray());
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
    public UUID submitDataByToken(String token, Map<String, Object> submissionData, String status) {
        // 1. Resolve the token to the internal Form
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // 2. Re-use the standard submission logic (rule engine, column mapping, etc.)
        return submitData(form.getId(), submissionData, status);
    }

    /**
     * Publicly retrieve a submission for editing via its form token.
     */
    public Map<String, Object> getSubmissionByToken(String token, UUID submissionId) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        Map<String, Object> submission = getSubmissionById(form.getId(), submissionId);
        if (submission == null)
            return null;

        // Extract status for logic check
        String status = (String) submission.get("submission_status");
        boolean isDraft = "DRAFT".equalsIgnoreCase(status);

        // Logic:
        // 1. If it's a DRAFT, allow access (so respondents can resume work).
        // 2. Otherwise, only allow if form.isAllowEditResponse() is true OR user is the
        // owner.
        if (!isDraft && !form.isAllowEditResponse() && !isOwner(form)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Editing is disabled for this form.");
        }

        return submission;
    }

    /**
     * Publicly update a submission for editing via its form token.
     */
    @Transactional
    public UUID updateSubmissionByToken(String token, UUID submissionId, Map<String, Object> submissionData,
            String status) {
        // 1. Resolve token
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // 2. Security Check: Only allow update if DRAFT or allowEditResponse is true
        Map<String, Object> current = getSubmissionById(form.getId(), submissionId);
        if (current == null)
            throw new RuntimeException("Submission not found.");

        String currentStatus = (String) current.get("submission_status");
        boolean isDraft = "DRAFT".equalsIgnoreCase(currentStatus);

        if (!isDraft && !form.isAllowEditResponse() && !isOwner(form)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This submission has already been finalized and cannot be edited.");
        }

        // 3. Perform the update
        return updateSubmission(form.getId(), submissionId, submissionData, status);
    }

    /**
     * Server-side evaluation of calculation formulas to ensure data integrity.
     */
    private void recalculateCalculatedFields(Map<String, Object> data, List<FormField> fields) {
        for (FormField field : fields) {
            String formula = field.getCalculationFormula();
            if (formula != null && !formula.isBlank()) {
                try {
                    String evaluatedFormula = formula;
                    // Replace variables with values from data
                    for (FormField dep : fields) {
                        if (dep.getColumnName() != null && formula.contains(dep.getColumnName())) {
                            Object val = data.getOrDefault(dep.getColumnName(), 0);
                            double numVal = 0;
                            if (val instanceof Number)
                                numVal = ((Number) val).doubleValue();
                            else if (val instanceof String) {
                                try {
                                    numVal = Double.parseDouble((String) val);
                                } catch (Exception ignored) {
                                }
                            }
                            // Replace whole word to avoid partial matching
                            evaluatedFormula = evaluatedFormula.replaceAll("\\b" + dep.getColumnName() + "\\b",
                                    String.valueOf(numVal));
                        }
                    }

                    // Sanitize and evaluate
                    if (evaluatedFormula.matches("[0-9+\\-*/().\\s]+")) {
                        double result = SimpleMathEvaluator.evaluate(evaluatedFormula);
                        data.put(field.getColumnName(), Math.round(result * 100.0) / 100.0);
                    }
                } catch (Exception e) {
                    System.err.println(
                            "Backend calculation failed for field " + field.getColumnName() + ": " + e.getMessage());
                }
            }
        }
    }

    /**
     * A very basic math evaluator for +, -, *, / and parentheses.
     */
    private static class SimpleMathEvaluator {
        public static double evaluate(String expression) {
            return new Object() {
                int pos = -1, ch;

                void nextChar() {
                    ch = (++pos < expression.length()) ? expression.charAt(pos) : -1;
                }

                boolean eat(int charToEat) {
                    while (ch == ' ')
                        nextChar();
                    if (ch == charToEat) {
                        nextChar();
                        return true;
                    }
                    return false;
                }

                double parse() {
                    nextChar();
                    double x = parseExpression();
                    if (pos < expression.length())
                        throw new RuntimeException("Unexpected: " + (char) ch);
                    return x;
                }

                double parseExpression() {
                    double x = parseTerm();
                    for (;;) {
                        if (eat('+'))
                            x += parseTerm(); // addition
                        else if (eat('-'))
                            x -= parseTerm(); // subtraction
                        else
                            return x;
                    }
                }

                double parseTerm() {
                    double x = parseFactor();
                    for (;;) {
                        if (eat('*'))
                            x *= parseFactor(); // multiplication
                        else if (eat('/'))
                            x /= parseFactor(); // division
                        else
                            return x;
                    }
                }

                double parseFactor() {
                    if (eat('+'))
                        return parseFactor(); // unary plus
                    if (eat('-'))
                        return -parseFactor(); // unary minus
                    double x;
                    int startPos = this.pos;
                    if (eat('(')) { // parentheses
                        x = parseExpression();
                        eat(')');
                    } else if ((ch >= '0' && ch <= '9') || ch == '.') { // numbers
                        while ((ch >= '0' && ch <= '9') || ch == '.')
                            nextChar();
                        x = Double.parseDouble(expression.substring(startPos, this.pos));
                    } else {
                        throw new RuntimeException("Unexpected: " + (char) ch);
                    }
                    return x;
                }
            }.parse();
        }
    }
}