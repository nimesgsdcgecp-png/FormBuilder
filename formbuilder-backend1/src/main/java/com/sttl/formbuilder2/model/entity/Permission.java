package com.sttl.formbuilder2.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "permissions")
@Getter
@Setter
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @Column(nullable = false)
    private String category; // e.g., "FORM", "ADMIN", "USER"

    // Optional: Mapping to specific menu/feature IDs
    @Column(name = "feature_id")
    private String featureId;
}
