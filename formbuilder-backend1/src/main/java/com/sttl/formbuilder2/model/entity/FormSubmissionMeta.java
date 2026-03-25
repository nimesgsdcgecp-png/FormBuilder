package com.sttl.formbuilder2.model.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "form_submission_meta")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder
public class FormSubmissionMeta {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "uuid", updatable = false)
    private UUID id;

    @Column(name = "form_id", nullable = false)
    private Long formId;

    @Column(name = "form_version_id", nullable = false)
    private Long formVersionId;

    @Column(name = "submission_table", nullable = false)
    private String submissionTable;

    @Column(name = "submission_row_id", nullable = false, columnDefinition = "uuid")
    private UUID submissionRowId;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "RESPONSE_DRAFT"; // RESPONSE_DRAFT or SUBMITTED

    @Column(name = "submitted_by")
    private String submittedBy;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private Instant createdAt;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;
}
