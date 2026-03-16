package com.sttl.formbuilder2.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@org.hibernate.annotations.SQLRestriction("deleted = false")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    @JsonIgnore
    private String passwordHash;

    @Column(nullable = false)
    private boolean deleted = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Set<UserFormRole> userFormRoles = new HashSet<>();

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Gets all permissions for the user, combining those from global and scoped roles.
     */
    @JsonIgnore
    public Set<String> getPermissions() {
        Set<String> permissions = new HashSet<>();
        for (UserFormRole ufr : userFormRoles) {
            ufr.getRole().getPermissions().forEach(p -> permissions.add(p.getName()));
        }
        return permissions;
    }

    /**
     * Checks if user has a permission globally or for a specific form.
     */
    public boolean hasPermission(String permissionName, Long formId) {
        for (UserFormRole ufr : userFormRoles) {
            // Check global roles (formId is null) or matching scoped roles
            if (ufr.getFormId() == null || (formId != null && formId.equals(ufr.getFormId()))) {
                if (ufr.getRole().getPermissions().stream().anyMatch(p -> p.getName().equals(permissionName))) {
                    return true;
                }
            }
        }
        return false;
    }
}
