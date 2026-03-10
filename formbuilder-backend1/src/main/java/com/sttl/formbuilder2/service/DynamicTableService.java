package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.enums.FieldType;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * DynamicTableService — DDL Management for Form Submission Tables
 *
 * What it does:
 * Creates and evolves the physical PostgreSQL tables that store form submission
 * data. Each published form gets its own dedicated table (e.g.
 * {@code sub_3_v1})
 * with one SQL column for every form field.
 *
 * Why direct SQL (not JPA)?
 * JPA requires entity definitions at compile time. Since form schemas are
 * defined
 * at runtime by users, DDL must be executed dynamically via
 * {@code JdbcTemplate}.
 *
 * Called by:
 * {@code FormService.createForm()} — when a form is published for the first
 * time.
 * {@code FormService.updateForm()} — on re-publish to add new columns (additive
 * only).
 * {@code FormController} — via the "/columns/{col}/values" endpoint
 * (read-only).
 *
 * Schema evolution strategy:
 * Columns are only ever ADDED (ALTER TABLE … ADD COLUMN IF NOT EXISTS). Columns
 * for removed or renamed fields are kept in the database as "ghost columns" so
 * that historical submissions remain readable in the responses page.
 */
@Service
@RequiredArgsConstructor
public class DynamicTableService {

    private final JdbcTemplate jdbcTemplate;
    private final FormRepository formRepository;

    /**
     * Creates the physical PostgreSQL table for storing form submissions.
     *
     * Every generated table includes two standard system columns:
     * - {@code submission_id UUID PRIMARY KEY} — auto-generated UUID for each row.
     * - {@code submitted_at TIMESTAMP} — auto-set to the current time.
     *
     * Uses {@code CREATE TABLE IF NOT EXISTS} so that re-publishing a previously
     * published-then-drafted form does not throw a "relation already exists" error.
     *
     * DEV note: The generated DDL is printed to stdout for debugging purposes.
     *
     * @param tableName The dynamic table name (e.g. "sub_3_v1").
     * @param fields    The field definitions from the publish request.
     */
    @Transactional
    public void createDynamicTable(String tableName, List<FieldDefinitionRequestDTO> fields) {
        StringBuilder sql = new StringBuilder();

        sql.append("CREATE TABLE IF NOT EXISTS ").append(tableName).append(" (");

        // Standard system columns present in every submission table
        sql.append("submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ");
        sql.append("submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");

        // Dynamic form field columns — one per field definition
        for (FieldDefinitionRequestDTO field : fields) {
            if (field.getType() == FieldType.SECTION_HEADER || field.getType() == FieldType.INFO_LABEL
                    || field.getType() == FieldType.PAGE_BREAK) {
                continue;
            }
            String columnName = field.getColumnName();
            if (columnName == null || columnName.trim().isEmpty()) {
                columnName = generateColumnName(field.getLabel());
            }
            String sqlType = mapToSqlType(field.getType());
            sql.append(columnName).append(" ").append(sqlType).append(", ");
        }

        // Remove the trailing ", " from the last field
        if (!fields.isEmpty()) {
            sql.setLength(sql.length() - 2);
        }
        sql.append(");");

        // DEV: Log the DDL for debugging. Replace with a proper logger in production.
        System.out.println("Executing DDL: " + sql);
        jdbcTemplate.execute(sql.toString());
    }

    /**
     * Handles schema evolution by adding new columns to an existing submission
     * table.
     * Only columns that do NOT already exist are added (additive-only migration).
     * Existing columns — including "ghost" columns from previously removed fields —
     * are left completely untouched.
     *
     * DEV note: Each ALTER TABLE statement is printed to stdout for debugging.
     *
     * @param tableName The existing dynamic table name.
     * @param newFields The updated field list from the re-publish request.
     */
    @Transactional
    public void alterDynamicTable(String tableName, List<FieldDefinitionRequestDTO> newFields) {
        // Fetch the current column names from the database's information schema
        String checkSql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
        List<String> existingColumns = jdbcTemplate.queryForList(checkSql, String.class, tableName);

        for (FieldDefinitionRequestDTO field : newFields) {
            if (field.getType() == FieldType.SECTION_HEADER || field.getType() == FieldType.INFO_LABEL
                    || field.getType() == FieldType.PAGE_BREAK) {
                continue;
            }
            String columnName = field.getColumnName();
            if (columnName == null || columnName.trim().isEmpty()) {
                columnName = generateColumnName(field.getLabel());
            }
            if (!existingColumns.contains(columnName)) {
                String sql = "ALTER TABLE " + tableName
                        + " ADD COLUMN " + columnName
                        + " " + mapToSqlType(field.getType());
                // DEV: Log for debugging
                System.out.println("Executing Schema Evolution: " + sql);
                jdbcTemplate.execute(sql);
            }
        }
    }

    /**
     * Returns distinct non-null values for a specified column, used at form-fill
     * time to populate the options of a LOOKUP field.
     *
     * Security: The column name is validated against the form's actual field list
     * before the query is executed to prevent SQL injection attacks.
     *
     * @param formId     The form whose submissions table is queried.
     * @param columnName The SQL column name to fetch distinct values from.
     * @return A list of unique non-null string values for that column.
     * @throws RuntimeException if the column name is not a valid field of this
     *                          form.
     */
    public List<String> getColumnValues(Long formId, String columnName) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        // Validate the column belongs to this form (prevents SQL injection)
        boolean columnExists = form.getVersions().get(0).getFields().stream()
                .anyMatch(f -> f.getColumnName().equals(columnName));

        if (!columnExists) {
            throw new RuntimeException("Invalid column name: " + columnName);
        }

        String tableName = form.getTargetTableName();
        String sql = "SELECT DISTINCT " + columnName + " FROM " + tableName
                + " WHERE " + columnName + " IS NOT NULL";

        return jdbcTemplate.queryForList(sql, String.class);
    }

    // ── Private Helpers ────────────────────────────────────

    /**
     * Converts a human-readable field label to a valid SQL snake_case column name.
     * Example: "First Name" → "first_name", "Customer ID#" → "customer_id_".
     *
     * @param label The field label as entered by the form builder.
     * @return A lowercase snake_case SQL-safe identifier.
     */
    private String generateColumnName(String label) {
        return label.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_");
    }

    /**
     * Maps a {@link FieldType} enum value to the corresponding PostgreSQL column
     * type used when creating or altering a submission table.
     *
     * @param type The field type enum value.
     * @return A PostgreSQL type string (e.g. "VARCHAR(500)", "INTEGER", "DATE").
     */
    private String mapToSqlType(FieldType type) {
        return switch (type) {
            case TEXT, DROPDOWN, RADIO, FILE, LOOKUP -> "VARCHAR(500)";
            case NUMERIC, RATING, SCALE -> "INTEGER";
            case DATE -> "DATE";
            case TIME -> "TIME";
            case DATE_TIME -> "TIMESTAMP";
            case BOOLEAN -> "BOOLEAN";
            case TEXTAREA, CHECKBOX_GROUP,
                    GRID_RADIO, GRID_CHECK ->
                "TEXT";
            case SECTION_HEADER, INFO_LABEL, PAGE_BREAK -> null;
            default -> "VARCHAR(255)";
        };
    }
}