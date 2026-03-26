package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.enums.FieldType;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
        sql.append("form_version_id BIGINT, ");
        sql.append("submitted_by VARCHAR(100), ");
        sql.append("is_draft BOOLEAN DEFAULT FALSE, ");
        sql.append("submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");
        sql.append("updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");
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

        if (!existingColumns.contains("updated_at")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
            jdbcTemplate.execute(sql);
        }

        if (!existingColumns.contains("is_deleted")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE";
            jdbcTemplate.execute(sql);
        }

        if (!existingColumns.contains("form_version_id")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN form_version_id BIGINT";
            jdbcTemplate.execute(sql);
        }

        if (!existingColumns.contains("submitted_by")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN submitted_by VARCHAR(100)";
            jdbcTemplate.execute(sql);
        }

        if (!existingColumns.contains("is_draft")) {
            String sql = "ALTER TABLE \"" + tableName + "\" ADD COLUMN is_draft BOOLEAN DEFAULT FALSE";
            jdbcTemplate.execute(sql);
        }
    }

    public List<String> detectSchemaDrift(String tableName, List<com.sttl.formbuilder2.model.entity.FormField> fields) {
        List<String> dbColumns = getTableColumns(tableName);
        List<String> missing = new java.util.ArrayList<>();
        for (com.sttl.formbuilder2.model.entity.FormField field : fields) {
            String cname = field.getColumnName();
            if (cname != null && !cname.trim().isEmpty() && !dbColumns.contains(cname)) {
                missing.add(cname);
            }
        }
        return missing;
    }

    public void validateNoSchemaDrift(Form form) {
        String tableName = form.getTargetTableName();
        if (tableName == null) return;
        List<com.sttl.formbuilder2.model.entity.FormVersion> versions = form.getVersions();
        if (versions == null || versions.isEmpty()) return;
        
        com.sttl.formbuilder2.model.entity.FormVersion activeVersion = versions.stream()
            .filter(v -> Boolean.TRUE.equals(v.getIsActive()))
            .findFirst()
            .orElse(null);
            
        if (activeVersion == null) return; // No active version yet, no schema to enforce
        
        if (!tableExists(tableName)) return; // Table doesn't exist yet, no drift possible
            
        List<String> missingCols = detectSchemaDrift(tableName, activeVersion.getFields());
        if (!missingCols.isEmpty()) {
            throw new com.sttl.formbuilder2.exception.FormBuilderException("SCHEMA_DRIFT_DETECTED",
                "Table " + tableName + " is missing columns: " + missingCols);
        }
    }

    @Transactional
    public void insertData(String tableName, Map<String, Object> data) {
        StringBuilder sql = new StringBuilder("INSERT INTO \"").append(tableName).append("\" (");
        StringBuilder values = new StringBuilder("VALUES (");
        List<Object> params = new java.util.ArrayList<>();

        List<String> existingColumns = getTableColumns(tableName);
        
        data.forEach((col, val) -> {
            if (existingColumns.contains(col)) {
                sql.append("\"").append(col).append("\", ");
                values.append("?, ");
                
                // Convert complex types to JSON string before saving to DB
                if (val instanceof java.util.Collection || val instanceof java.util.Map) {
                    try {
                        params.add(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(val));
                    } catch (Exception e) {
                        params.add(val.toString());
                    }
                } else {
                    params.add(val);
                }
            }
        });

        if (params.isEmpty()) {
            return; // No matching columns to insert
        }

        sql.setLength(sql.length() - 2);
        values.setLength(values.length() - 2);
        sql.append(") ").append(values).append(")");

        jdbcTemplate.update(sql.toString(), params.toArray());
    }

    @Transactional
    public void updateData(String tableName, UUID id, Map<String, Object> data) {
        StringBuilder sql = new StringBuilder("UPDATE \"").append(tableName).append("\" SET ");
        List<Object> params = new java.util.ArrayList<>();

        List<String> existingColumns = getTableColumns(tableName);

        data.forEach((col, val) -> {
            if (existingColumns.contains(col) && !col.equals("submission_id")) {
                sql.append("\"").append(col).append("\" = ?, ");
                
                // Convert complex types to JSON string before saving to DB
                if (val instanceof java.util.Collection || val instanceof java.util.Map) {
                    try {
                        params.add(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(val));
                    } catch (Exception e) {
                        params.add(val.toString());
                    }
                } else {
                    params.add(val);
                }
            }
        });

        if (params.isEmpty()) {
            return; // No matching columns to update
        }

        sql.setLength(sql.length() - 2);
        sql.append(" WHERE submission_id = ?");
        params.add(id);

        jdbcTemplate.update(sql.toString(), params.toArray());
    }

    public Map<String, Object> fetchData(String tableName, int page, int size, String sortBy, String sortOrder, Map<String, String> filters) {
        StringBuilder where = new StringBuilder(" WHERE is_deleted = false");
        List<Object> params = new java.util.ArrayList<>();

        List<String> existingColumns = getTableColumns(tableName);
        String globalSearch = filters.get("q");

        filters.forEach((col, val) -> {
            if (val != null && !val.isBlank() && !col.equals("q") && existingColumns.contains(col)) {
                if (col.equals("form_version_id") || col.equals("id")) {
                    where.append(" AND \"").append(col).append("\" = ?");
                    try {
                        params.add(Long.parseLong(val));
                    } catch (NumberFormatException e) {
                        params.add(-1L);
                    }
                } else {
                    where.append(" AND \"").append(col).append("\" ILIKE ?");
                    params.add("%" + val + "%");
                }
            }
        });

        if (globalSearch != null && !globalSearch.isBlank()) {
            where.append(" AND (");
            for (int i = 0; i < existingColumns.size(); i++) {
                String column = existingColumns.get(i);
                where.append("CAST(\"").append(column).append("\" AS TEXT) ILIKE ?");
                params.add("%" + globalSearch + "%");
                if (i < existingColumns.size() - 1) {
                    where.append(" OR ");
                }
            }
            where.append(")");
        }

        String countSql = "SELECT COUNT(*) FROM \"" + tableName + "\"" + where;
        long totalElements = jdbcTemplate.queryForObject(countSql, Long.class, params.toArray());

        String dataSql = "SELECT * FROM \"" + tableName + "\"" + where +
                " ORDER BY \"" + sortBy + "\" " + sortOrder +
                " LIMIT " + size + " OFFSET " + (page * size);

        List<Map<String, Object>> content = jdbcTemplate.queryForList(dataSql, params.toArray());

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("content", content);
        result.put("totalElements", totalElements);
        result.put("totalPages", (int) Math.ceil((double) totalElements / size));
        result.put("size", size);
        result.put("number", page);

        return result;
    }

    public Map<String, Object> fetchRowById(String tableName, UUID id) {
        String sql = "SELECT * FROM \"" + tableName + "\" WHERE submission_id = ? AND is_deleted = false";
        return jdbcTemplate.queryForMap(sql, id);
    }

    @Transactional
    public void deleteRow(String tableName, UUID id) {
        String sql = "UPDATE \"" + tableName + "\" SET is_deleted = true WHERE submission_id = ?";
        jdbcTemplate.update(sql, id);
    }

    @Transactional
    public void deleteRowsBulk(String tableName, List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return;
        String sql = "UPDATE \"" + tableName + "\" SET is_deleted = true WHERE submission_id IN (" +
                ids.stream().map(i -> "?").collect(java.util.stream.Collectors.joining(",")) + ")";
        jdbcTemplate.update(sql, ids.toArray());
    }

    /**
     * SRS Bulk Operation: Update submission_status for multiple rows
     */
    @Transactional
    public void updateStatusBulk(String tableName, List<UUID> ids, String newStatus) {
        if (ids == null || ids.isEmpty()) return;
        String placeholders = ids.stream().map(i -> "?").collect(java.util.stream.Collectors.joining(","));
        String sql = "UPDATE \"" + tableName + "\" SET submission_status = ?, updated_at = NOW() WHERE submission_id IN (" + placeholders + ")";
        Object[] params = new Object[ids.size() + 1];
        params[0] = newStatus;
        for (int i = 0; i < ids.size(); i++) {
            params[i + 1] = ids.get(i);
        }
        jdbcTemplate.update(sql, params);
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

    @Transactional
    public void dropTable(String tableName) {
        if (tableName == null || tableName.trim().isEmpty()) return;
        String sql = "DROP TABLE IF EXISTS \"" + tableName + "\" CASCADE";
        jdbcTemplate.execute(sql);
    }

    public boolean tableExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, tableName);
        return count != null && count > 0;
    }

    public List<String> getTableColumns(String tableName) {
        String checkSql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
        return jdbcTemplate.queryForList(checkSql, String.class, tableName);
    }

    public List<Map<String, Object>> fetchAllData(String tableName) {
        String sql = "SELECT * FROM \"" + tableName + "\" WHERE is_deleted = false";
        return jdbcTemplate.queryForList(sql);
    }

    private String generateColumnName(String label) {
        String name = label.trim().toLowerCase().replaceAll("[^a-z0-9]+", "");
        com.sttl.formbuilder2.util.SqlKeywordValidator.validate(name);
        return name;
    }

    private String mapToSqlType(FieldType type) {
        return switch (type) {
            case TEXT, RADIO, FILE, LOOKUP, HIDDEN -> "VARCHAR(500)";
            case NUMERIC, RATING, SCALE, CALCULATED -> "DOUBLE PRECISION";
            case DATE -> "DATE";
            case TIME -> "TIME";
            case DATE_TIME -> "TIMESTAMP";
            case BOOLEAN -> "BOOLEAN";
            case TEXTAREA, DROPDOWN, CHECKBOX_GROUP,
                    GRID_RADIO, GRID_CHECK ->
                "TEXT";
            case SECTION_HEADER, INFO_LABEL, PAGE_BREAK -> null;
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