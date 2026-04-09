package com.sttl.formbuilder2.repository;

import java.util.UUID;
import com.sttl.formbuilder2.model.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUsername(String username);
}
