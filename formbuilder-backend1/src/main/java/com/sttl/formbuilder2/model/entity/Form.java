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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FormStatus status = FormStatus.DRAFT;

    @Column(nullable = true, unique = true, length = 100)
    private String code;

    @Column(name = "code_locked", nullable = false)
    @Builder.Default
    private Boolean codeLocked = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "target_table_name")
    private String targetTableName;

    @Column(name = "public_share_token", unique = true)
    @Builder.Default
    private String publicShareToken = UUID.randomUUID().toString();

    @Column(name = "allow_edit_response", nullable = false)
    @Builder.Default
    private boolean allowEditResponse = false;

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNumber DESC")
    @Builder.Default
    private List<FormVersion> versions = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = true)
    private AppUser owner;

    @ManyToOne
    @JoinColumn(name = "creator_id", nullable = true)
    private AppUser creator;

    @ManyToOne
    @JoinColumn(name = "approved_by_id", nullable = true)
    private AppUser approvedBy;

    @Column(name = "issued_by_username")
    private String issuedByUsername;

    @Column(name = "approval_chain", columnDefinition = "TEXT")
    private String approvalChain;
}