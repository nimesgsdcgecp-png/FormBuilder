package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.FieldValidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FieldValidationRepository extends JpaRepository<FieldValidation, UUID> {
    List<FieldValidation> findByFormVersionIdOrderByExecutionOrder(UUID formVersionId);
    void deleteByFormVersionId(UUID formVersionId);
}
