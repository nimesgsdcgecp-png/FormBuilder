package com.sttl.formbuilder2.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * FormVersion — Snapshot of a Form's Schema at the Time of Publishing
 *
 * What it does:
 * Every time a form is published (or re-published with changes), a new version
 * snapshot is created. This gives the application a rudimentary form-versioning
 * capability — submissions can always be traced back to the exact schema that
 * was active when they were collected.
 *
 * Maps to the {@code form_versions} table.
 *
 * Relationships:
 * - Many FormVersions → one parent {@link Form} (owned side).
 * - One FormVersion → Many {@link FormField}s (the field list for this
 * snapshot).
 *
 * Key fields:
 * - {@code versionNumber} — monotonically increasing integer per form.
 * - {@code rules} — JSON array of logic rules (serialized {@code FormRuleDTO}
 * objects) stored as TEXT. Deserialized by {@code SubmissionService} at runtime
 * using Jackson.
 * - {@code fields} — the ordered list of {@link FormField}s that make up the
 * schema for this version.
 *
 * Note: {@code @JsonIgnore} on the {@code form} back-reference prevents
 * infinite
 * recursion when Jackson serialises a FormVersion that is nested inside a Form.
 */
@Entity
@Table(name = "form_versions", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "form_id", "versionNumber" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Back-reference to the parent form. Hidden from JSON output to avoid cycles.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    @JsonIgnore
    private Form form;

    /** Monotonically increasing version counter scoped to the parent form. */
    @Column(nullable = false)
    private Integer versionNumber;

    /** Optional human-readable description of what changed in this version. */
    @Column(columnDefinition = "TEXT")
    private String changeLog;

    /** Timestamp set automatically when the version row is first inserted. */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /**
     * List of fields belonging to this version, ordered by their display position.
     * Cascade ALL + orphanRemoval means adding/removing fields here automatically
     * syncs to the {@code form_fields} table.
     */
    @OneToMany(mappedBy = "formVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordinalPosition ASC")
    @Builder.Default
    private List<FormField> fields = new ArrayList<>();

    /**
     * JSON array of {@code FormRuleDTO} objects stored as a TEXT column.
     * Example: {@code [{"id":"...","name":"Rule
     * 1","conditions":[...],"actions":[...]}]}
     * Deserialized by {@code SubmissionService} using Jackson's ObjectMapper before
     * being handed to {@code RuleEngineService} for evaluation.
     */
    @Column(name = "rules", columnDefinition = "TEXT")
    private String rules;
}