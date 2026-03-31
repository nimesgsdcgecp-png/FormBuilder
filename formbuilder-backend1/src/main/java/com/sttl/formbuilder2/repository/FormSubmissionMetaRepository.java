package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.FormSubmissionMeta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT COUNT(m) FROM FormSubmissionMeta m WHERE m.formId IN :formIds AND m.isDeleted = false AND m.status IN :statuses")
    long countByFormIdInAndIsDeletedFalseAndStatusIn(@Param("formIds") List<Long> formIds, @Param("statuses") List<String> statuses);

    @Modifying
    @Query("UPDATE FormSubmissionMeta m SET m.isDeleted = true WHERE m.formId = :formId AND m.status = :status")
    void softDeleteByFormIdAndStatus(@Param("formId") Long formId, @Param("status") String status);
}
