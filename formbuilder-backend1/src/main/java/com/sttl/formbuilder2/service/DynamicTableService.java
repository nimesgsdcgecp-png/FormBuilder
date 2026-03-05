package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.FieldDefinitionDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.enums.FieldType;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DynamicTableService {

    private final JdbcTemplate jdbcTemplate;
    private final FormRepository formRepository;

    /**
     * Generates and executes the CREATE TABLE statement for a new form.
     * Table Name Format: sub_{formId}_v{version}
     */
    @Transactional
    public void createDynamicTable(String tableName, List<FieldDefinitionDTO> fields) {
        StringBuilder sql = new StringBuilder();

        // 1. Start CREATE TABLE
        sql.append("CREATE TABLE ").append(tableName).append(" (");

        // 2. Add Standard System Columns
        sql.append("submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), ");
        sql.append("submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ");

        // 3. Loop through fields and map to SQL types
        for (FieldDefinitionDTO field : fields) {
            String columnName = generateColumnName(field.getLabel());
            String sqlType = mapToSqlType(field.getType());

            sql.append(columnName).append(" ").append(sqlType).append(", ");
        }

        // 4. Clean up trailing comma and close
        if (!fields.isEmpty()) {
            sql.setLength(sql.length() - 2); // Remove last ", "
        }
        sql.append(");");

        // 5. Execute the DDL
        System.out.println("Executing DDL: " + sql.toString()); // For debugging
        jdbcTemplate.execute(sql.toString());
    }

    // Helper: Converts "First Name" -> "first_name"
    private String generateColumnName(String label) {
        return label.trim().toLowerCase().replaceAll("[^a-z0-9]", "_");
    }

    // Helper: Maps Java Enums to PostgreSQL Types
    private String mapToSqlType(FieldType type) {
        return switch (type) {
            case TEXT, DROPDOWN, RADIO, FILE, LOOKUP -> "VARCHAR(500)"; // Single selection
            case NUMERIC, RATING, SCALE -> "INTEGER";
            case DATE -> "DATE";
            case TIME -> "TIME"; // <--- NEW
            case BOOLEAN -> "BOOLEAN";
            case TEXTAREA, CHECKBOX_GROUP, GRID_RADIO, GRID_CHECK -> "TEXT"; // Multiple selections need TEXT
            default -> "VARCHAR(255)";
        };
    }

    /**
     * Handles Schema Evolution: Adds new columns to an existing table.
     */
    @Transactional
    public void alterDynamicTable(String tableName, List<FieldDefinitionDTO> newFields) {
        // 1. Get existing columns from the database catalog to avoid duplicates
        String checkSql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
        List<String> existingColumns = jdbcTemplate.queryForList(checkSql, String.class, tableName);

        // 2. Iterate through new fields and generate ALTER statements
        for (FieldDefinitionDTO field : newFields) {
            String columnName = generateColumnName(field.getLabel());

            // If the column does NOT exist, add it
            if (!existingColumns.contains(columnName)) {
                StringBuilder sql = new StringBuilder();
                sql.append("ALTER TABLE ").append(tableName)
                        .append(" ADD COLUMN ").append(columnName)
                        .append(" ").append(mapToSqlType(field.getType()));

                System.out.println("Executing Schema Evolution: " + sql);
                jdbcTemplate.execute(sql.toString());
            }
        }
    }

    public List<String> getColumnValues(Long formId, String columnName) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        // 1. Validate that the column actually exists in this form to prevent SQL Injection
        boolean columnExists = form.getVersions().get(0).getFields().stream()
                .anyMatch(f -> f.getColumnName().equals(columnName));

        if (!columnExists) {
            throw new RuntimeException("Invalid column name");
        }

        // 2. Query distinct non-null values from that specific column
        String tableName = form.getTargetTableName();
        String sql = "SELECT DISTINCT " + columnName + " FROM " + tableName + " WHERE " + columnName + " IS NOT NULL";

        return jdbcTemplate.queryForList(sql, String.class);
    }
}