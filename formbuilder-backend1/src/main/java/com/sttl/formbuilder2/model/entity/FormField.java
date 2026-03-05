package com.sttl.formbuilder2.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sttl.formbuilder2.model.enums.FieldType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "form_fields", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"form_version_id", "columnName"})
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_version_id", nullable = false)
    @JsonIgnore
    private FormVersion formVersion;

    @Column(nullable = false)
    private String fieldLabel;

    @Column(nullable = false, length = 64)
    private String columnName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FieldType fieldType;

    @Column(nullable = false)
    private Boolean isMandatory;

    @Column(nullable = false)
    private Integer ordinalPosition;

    @Column(name = "default_value")
    private String defaultValue; // <--- ADD THIS (We store everything as String)

    // Store validation rules as JSONB
    // Requires hibernate-types or standard JPA 3.2+ JSON support
    // For standard Postgres driver + Spring Boot 3, we use JdbcTypeCode
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_rules", columnDefinition = "jsonb")
    private Map<String, Object> validationRules;

    @Column(name = "field_options", columnDefinition = "TEXT")
    private String options; // Stores JSON string: '["Option A", "Option B"]'

}