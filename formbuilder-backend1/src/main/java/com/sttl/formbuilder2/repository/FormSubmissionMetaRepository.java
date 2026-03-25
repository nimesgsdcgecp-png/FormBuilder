package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.FormSubmissionMeta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FormSubmissionMetaRepository extends JpaRepository<FormSubmissionMeta, UUID> {
    Optional<FormSubmissionMeta> findByFormIdAndSubmittedByAndStatus(Long formId, String submittedBy, String status);
    Page<FormSubmissionMeta> findByFormIdAndIsDeletedFalse(Long formId, Pageable pageable);
    List<FormSubmissionMeta> findByFormIdAndIsDeletedFalseAndStatus(Long formId, String status);
    Optional<FormSubmissionMeta> findBySubmissionRowId(UUID rowId);
}
