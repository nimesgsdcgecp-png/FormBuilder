package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, UUID> {
    Optional<WorkflowInstance> findByFormIdAndStatus(UUID formId, WorkflowInstance.WorkflowStatus status);
    
    List<com.sttl.formbuilder2.model.entity.WorkflowInstance> findAllByFormId(UUID formId);

    List<com.sttl.formbuilder2.model.entity.WorkflowInstance> findByCreatorOrderByCreatedAtDesc(com.sttl.formbuilder2.model.entity.AppUser creator);
}
