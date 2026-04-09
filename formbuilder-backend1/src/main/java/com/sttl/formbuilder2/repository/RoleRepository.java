package com.sttl.formbuilder2.repository;

import java.util.UUID;
import com.sttl.formbuilder2.model.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    Optional<Role> findByName(String name);
}
