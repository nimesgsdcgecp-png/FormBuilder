package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.FieldValidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FieldValidationRepository extends JpaRepository<FieldValidation, Long> {
    List<FieldValidation> findByFormVersionIdOrderByExecutionOrder(Long formVersionId);
    void deleteByFormVersionId(Long formVersionId);
}
