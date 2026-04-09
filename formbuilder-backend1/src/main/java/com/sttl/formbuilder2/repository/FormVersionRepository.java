package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.FormVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Repository
public interface FormVersionRepository extends JpaRepository<FormVersion, UUID> {
    Optional<FormVersion> findByFormIdAndIsActiveTrue(UUID formId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"fields"})
    List<FormVersion> findByFormIdOrderByVersionNumberDesc(UUID formId);
    boolean existsByFormIdAndIsActiveTrue(UUID formId);
}
