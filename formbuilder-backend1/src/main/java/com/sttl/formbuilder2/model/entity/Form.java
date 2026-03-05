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
    private FormStatus status;

    // The prefix for the dynamic table (e.g., "form_data_101")
    @Column(name = "target_table_name", unique = true, length = 64)
    private String targetTableName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    // One-to-Many relationship with Versions
    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNumber DESC") // Latest version first
    private List<FormVersion> versions = new ArrayList<>();

    @Column(name = "public_share_token", unique = true, nullable = false, updatable = false)
    private String publicShareToken = UUID.randomUUID().toString();
}