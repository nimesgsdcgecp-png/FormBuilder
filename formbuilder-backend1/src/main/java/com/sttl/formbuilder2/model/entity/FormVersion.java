package com.sttl.formbuilder2.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "form_versions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"form_id", "versionNumber"})
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    @JsonIgnore
    private Form form;

    @Column(nullable = false)
    private Integer versionNumber;

    @Column(columnDefinition = "TEXT")
    private String changeLog;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "formVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordinalPosition ASC")
    private List<FormField> fields = new ArrayList<>();

    @Column(name = "rules", columnDefinition = "TEXT")
    private String rules; // We will store the JSON array of rules here
}