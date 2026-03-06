package com.sttl.formbuilder2.model.entity;

import com.sttl.formbuilder2.model.enums.FormStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Form — Core JPA Entity
 *
 * What it does:
 * Represents a single form created by a builder user. Maps to the {@code forms}
 * table in PostgreSQL. This is the root aggregate for the entire form object
 * graph.
 *
 * Relationships:
 * - One Form → Many {@link FormVersion}s (the history of published snapshots).
 * The current live version is always {@code versions.get(0)} (ordered desc by
 * version number via {@code @OrderBy}).
 *
 * Key fields:
 * - {@code publicShareToken} — a UUID used in the public URL (/f/{token}).
 * Decouples the public-facing URL from the internal integer ID, preventing
 * enumeration attacks.
 * - {@code targetTableName} — the dynamic PostgreSQL table (e.g. "sub_3_v1")
 * where this form's submissions are stored.
 * - {@code allowEditResponse} — whether respondents can edit their submission
 * after it has been submitted.
 * - {@code status} — DRAFT | PUBLISHED | ARCHIVED (soft-delete).
 *
 * Lombok annotations used:
 * {@code @Builder}, {@code @Getter}, {@code @Setter},
 * {@code @NoArgsConstructor},
 * {@code @AllArgsConstructor} eliminate boilerplate
 * getters/setters/constructors.
 */
@Entity
@Table(name = "forms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Form {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Lifecycle status — controls dashboard visibility and public accessibility.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FormStatus status = FormStatus.DRAFT;

    /** Auto-set on creation; never updated after that. */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /** Auto-updated on every save by Hibernate. */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    /**
     * The name of the dynamic PostgreSQL table that stores this form's submissions
     * (e.g. "sub_2_v1"). Created by {@code DynamicTableService} when the form is
     * first published.
     */
    @Column(name = "target_table_name")
    private String targetTableName;

    /**
     * UUID-based public token used in the shareable link (/f/{token}).
     * Prevents guessing form IDs from the public URL.
     */
    @Column(name = "public_share_token", unique = true)
    @Builder.Default
    private String publicShareToken = UUID.randomUUID().toString();

    /**
     * When true, respondents see an "Edit your response" button after submission,
     * allowing them to update their answers. Stored on the form so each form can
     * independently enable or disable the feature.
     */
    @Column(name = "allow_edit_response", nullable = false)
    @Builder.Default
    private boolean allowEditResponse = false;

    /**
     * Ordered list of all published snapshots of this form. The most recently
     * published version is always at index 0 (desc order by versionNumber).
     * CascadeType.ALL ensures versions are persisted/deleted alongside the form.
     */
    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNumber DESC")
    @Builder.Default
    private List<FormVersion> versions = new ArrayList<>();
}