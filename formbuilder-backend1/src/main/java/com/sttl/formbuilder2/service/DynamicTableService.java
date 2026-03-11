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
 */
@Service
@RequiredArgsConstructor
public class DynamicTableService {

    private final JdbcTemplate jdbcTemplate;
    private final FormRepository formRepository;

    @Transactional
    public void createDynamicTable(String tableName, List<FieldDefinitionRequestDTO> fields) {
        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE IF NOT EXISTS \"").append(tableName).append("\" (");

        sql.append("submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ");
        sql.append("submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");
        sql.append("submission_status VARCHAR(20) DEFAULT 'FINAL', ");
        sql.append("is_deleted BOOLEAN DEFAULT FALSE, ");

        List<FieldDefinitionRequestDTO> allFields = new java.util.ArrayList<>();
        flattenFields(fields, allFields);

        for (FieldDefinitionRequestDTO field : allFields) {
            if (field.getType() == FieldType.SECTION_HEADER || field.getType() == FieldType.INFO_LABEL
                    || field.getType() == FieldType.PAGE_BREAK) {
                continue;
            }
            String columnName = field.getColumnName();
            if (columnName == null || columnName.trim().isEmpty()) {
                columnName = generateColumnName(field.getLabel());
            }
            String sqlType = mapToSqlType(field.getType());
            sql.append("\"").append(columnName).append("\" ").append(sqlType).append(", ");
        }

        if (!allFields.isEmpty()) {
            sql.setLength(sql.length() - 2);
        }
        sql.append(");");

        jdbcTemplate.execute(sql.toString());
    }

    @Transactional
    public void alterDynamicTable(String tableName, List<FieldDefinitionRequestDTO> newFields) {
        String checkSql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
        List<String> existingColumns = jdbcTemplate.queryForList(checkSql, String.class, tableName);

        List<FieldDefinitionRequestDTO> allNewFields = new java.util.ArrayList<>();
        flattenFields(newFields, allNewFields);

        for (FieldDefinitionRequestDTO field : allNewFields) {
            if (field.getType() == FieldType.SECTION_HEADER || field.getType() == FieldType.INFO_LABEL
                    || field.getType() == FieldType.PAGE_BREAK) {
                continue;
            }
            String columnName = field.getColumnName();
            if (columnName == null || columnName.trim().isEmpty()) {
                columnName = generateColumnName(field.getLabel());
            }
            if (!existingColumns.contains(columnName)) {
                String sql = "ALTER TABLE \"" + tableName + "\""
                        + " ADD COLUMN \"" + columnName + "\""
                        + " " + mapToSqlType(field.getType());
                jdbcTemplate.execute(sql);
            }
        }

        if (!existingColumns.contains("submission_status")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN submission_status VARCHAR(20) DEFAULT 'FINAL'";
            jdbcTemplate.execute(sql);
        }

        if (!existingColumns.contains("is_deleted")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE";
            jdbcTemplate.execute(sql);
        }
    }

    public List<String> getColumnValues(Long formId, String columnName) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        boolean columnExists = form.getVersions().get(0).getFields().stream()
                .anyMatch(f -> f.getColumnName().equals(columnName));

        if (!columnExists) {
            throw new RuntimeException("Invalid column name: " + columnName);
        }

        String tableName = form.getTargetTableName();
        String sql = "SELECT DISTINCT \"" + columnName + "\" FROM \"" + tableName + "\""
                + " WHERE \"" + columnName + "\" IS NOT NULL";

        return jdbcTemplate.queryForList(sql, String.class);
    }

    private String generateColumnName(String label) {
        return label.trim().toLowerCase().replaceAll("[^a-z0-9]+", "_");
    }

    private String mapToSqlType(FieldType type) {
        return switch (type) {
            case TEXT, RADIO, FILE, LOOKUP, HIDDEN -> "VARCHAR(500)";
            case NUMERIC, RATING, SCALE -> "INTEGER";
            case DATE -> "DATE";
            case TIME -> "TIME";
            case DATE_TIME -> "TIMESTAMP";
            case BOOLEAN -> "BOOLEAN";
            case TEXTAREA, DROPDOWN, CHECKBOX_GROUP,
                    GRID_RADIO, GRID_CHECK ->
                "TEXT";
            case SECTION_HEADER, INFO_LABEL, PAGE_BREAK -> null;
            case CALCULATED -> "DOUBLE PRECISION";
            default -> "VARCHAR(255)";
        };
    }

    private void flattenFields(List<FieldDefinitionRequestDTO> fields, List<FieldDefinitionRequestDTO> allFields) {
        if (fields == null)
            return;
        for (FieldDefinitionRequestDTO field : fields) {
            allFields.add(field);
            if (field.getChildren() != null && !field.getChildren().isEmpty()) {
                flattenFields(field.getChildren(), allFields);
            }
        }
    }
}