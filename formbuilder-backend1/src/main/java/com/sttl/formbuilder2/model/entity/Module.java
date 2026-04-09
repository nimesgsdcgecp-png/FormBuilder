package com.sttl.formbuilder2.model.entity;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "modules")
@Getter
@Setter
public class Module {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "module_name", nullable = false)
    private String moduleName;

    @Column(name = "prefix")
    private String prefix;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "sub_parent_id")
    private UUID subParentId;

    @Column(name = "icon_css")
    private String menuIconCss;

    @Column(name = "is_parent")
    private Boolean isParent = false;

    @Column(name = "is_sub_parent")
    private Boolean isSubParent = false;

    @Column(name = "active")
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
