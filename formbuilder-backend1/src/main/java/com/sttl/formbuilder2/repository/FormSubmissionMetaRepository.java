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
import java.util.UUID;
import java.util.Optional;

@Repository
public interface FormSubmissionMetaRepository extends JpaRepository<FormSubmissionMeta, UUID> {
    Optional<FormSubmissionMeta> findByFormIdAndSubmittedByAndStatus(UUID formId, String submittedBy, String status);
    Page<FormSubmissionMeta> findByFormIdAndIsDeletedFalse(UUID formId, Pageable pageable);
    List<FormSubmissionMeta> findByFormIdAndIsDeletedFalseAndStatus(UUID formId, String status);
    Optional<FormSubmissionMeta> findBySubmissionRowId(UUID rowId);

    @Query("SELECT COUNT(m) FROM FormSubmissionMeta m WHERE m.formId IN :formIds AND m.isDeleted = false AND m.status IN :statuses")
    long countByFormIdInAndIsDeletedFalseAndStatusIn(@Param("formIds") List<UUID> formIds, @Param("statuses") List<String> statuses);

    @Modifying
    @Query("UPDATE FormSubmissionMeta m SET m.isDeleted = true WHERE m.formId = :formId AND m.status = :status")
    void softDeleteByFormIdAndStatus(@Param("formId") UUID formId, @Param("status") String status);
}
