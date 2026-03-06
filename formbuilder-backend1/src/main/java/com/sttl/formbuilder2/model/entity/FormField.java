package com.sttl.formbuilder2.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sttl.formbuilder2.model.enums.FieldType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * FormField — A Single Field within a {@link FormVersion}
 *
 * What it does:
 * Represents one question/input on a form — e.g. a text box, dropdown, or date
 * picker. Maps to the {@code form_fields} table.
 *
 * Relationships:
 * - Many FormFields → one parent {@link FormVersion} (owned side).
 * - {@code @JsonIgnore} on the back-reference prevents infinite serialisation
 * loops when Jackson writes a FormVersion containing its fields.
 *
 * Key fields:
 * - {@code fieldType} — determines which HTML input is rendered on the
 * public form page and which SQL column type is used in the submissions table.
 * - {@code columnName} — the SQL column name auto-generated from the label
 * (e.g. "First Name" → "first_name"). Must be unique per version.
 * - {@code ordinalPosition} — the display order of this field on the form.
 * - {@code validationRules} — stored as JSONB (requires Hibernate's
 * JdbcTypeCode
 * annotation). Contains keys like {@code required}, {@code min}, {@code max},
 * {@code minLength}, {@code maxLength}, {@code pattern}.
 * - {@code options} — serialised JSON string for choice-based fields:
 * Dropdown/Radio — {@code ["Option A","Option B"]}
 * Grid — {@code {"rows":[...],"cols":[...]}}
 * Lookup — {@code {"formId":"3","columnName":"city"}}
 * - {@code defaultValue} — pre-fills the field for the respondent; stored as
 * a String regardless of field type.
 */
@Entity
@Table(name = "form_fields", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "form_version_id", "columnName" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Back-reference to the owning version — hidden from JSON to prevent cycles.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_version_id", nullable = false)
    @JsonIgnore
    private FormVersion formVersion;

    /** Human-readable label shown to the respondent (e.g. "Your Email Address"). */
    @Column(nullable = false)
    private String fieldLabel;

    /**
     * Auto-generated snake_case SQL column name used in the dynamic submissions
     * table and in logic-rule conditions (e.g. "your_email_address").
     * Unique within a version to prevent duplicate columns.
     */
    @Column(nullable = false, length = 64)
    private String columnName;

    /** Determines the HTML input type and the PostgreSQL column type. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FieldType fieldType;

    /** If true, the submission is rejected if this field is left blank. */
    @Column(nullable = false)
    private Boolean isMandatory;

    /** Display position on the form canvas — lower numbers appear first. */
    @Column(nullable = false)
    private Integer ordinalPosition;

    /**
     * Pre-filled value shown to respondents; stored as String for all field types.
     */
    @Column(name = "default_value")
    private String defaultValue;

    /**
     * JSON validation constraints stored in PostgreSQL JSONB format.
     * Hibernate's {@code @JdbcTypeCode(SqlTypes.JSON)} handles the
     * serialisation/deserialisation automatically.
     * Example keys: required, min, max, minLength, maxLength, pattern.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    private Map<String, Object> validationRules;

    /**
     * Stores option data as a JSON string (TEXT column) for choice-based fields.
     * Examples:
     * Dropdown/Radio/Checkboxes — {@code ["Option A","Option B"]}
     * Grid fields — {@code {"rows":["Row1"],"cols":["Col1"]}}
     * Lookup field — {@code {"formId":"3","columnName":"city"}}
     */
    @Column(name = "field_options", columnDefinition = "TEXT")
    private String options;

}