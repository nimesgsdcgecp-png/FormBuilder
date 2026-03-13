package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import com.sttl.formbuilder2.model.entity.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Long> {
    List<WorkflowStep> findByInstanceIdOrderByStepIndexAsc(Long instanceId);

    @Query("SELECT s FROM WorkflowStep s JOIN s.instance i WHERE s.approver.id = :userId " +
           "AND s.status = :stepStatus " +
           "AND i.status = :instanceStatus " +
           "AND i.currentStepIndex = s.stepIndex")
    List<WorkflowStep> findPendingStepsForUser(
        @Param("userId") Long userId, 
        @Param("stepStatus") WorkflowStep.StepStatus stepStatus,
        @Param("instanceStatus") WorkflowInstance.WorkflowStatus instanceStatus
    );

    @Query("SELECT DISTINCT s.instance FROM WorkflowStep s WHERE s.approver.id = :userId AND s.status != 'PENDING'")
    List<WorkflowInstance> findInstancesHandledByUser(@Param("userId") Long userId);
}
