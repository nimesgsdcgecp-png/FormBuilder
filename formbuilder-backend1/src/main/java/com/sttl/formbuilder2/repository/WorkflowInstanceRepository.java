package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {
    Optional<WorkflowInstance> findByFormIdAndStatus(Long formId, WorkflowInstance.WorkflowStatus status);
    
    List<com.sttl.formbuilder2.model.entity.WorkflowInstance> findAllByFormId(Long formId);

    List<com.sttl.formbuilder2.model.entity.WorkflowInstance> findByCreatorOrderByCreatedAtDesc(com.sttl.formbuilder2.model.entity.AppUser creator);
}
