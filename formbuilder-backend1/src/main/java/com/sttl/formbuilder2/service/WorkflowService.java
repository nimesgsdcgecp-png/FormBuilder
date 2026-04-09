package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.WorkflowRequestDTO;
import com.sttl.formbuilder2.dto.response.UserSummaryDTO;
import com.sttl.formbuilder2.model.entity.*;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowStepRepository stepRepository;
    private final FormRepository formRepository;
    private final UserRepository userRepository;

    private final FormWorkflowService formWorkflowService;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    @jakarta.annotation.PostConstruct
    public void fixDatabaseConstraints() {
        try {
            // 1. Fix forms_status_check constraint
            jdbcTemplate.execute("ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_status_check");
            jdbcTemplate.execute("ALTER TABLE forms ADD CONSTRAINT forms_status_check CHECK (status IN ('DRAFT', 'PENDING_DRAFT', 'PENDING_PUBLISH', 'PUBLISHED', 'REJECTED', 'ARCHIVED'))");
            
            // 2. Ensure level_up_requests table exists (since ddl-auto=validate is on)
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS level_up_requests (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "user_id BIGINT NOT NULL REFERENCES users(id), " +
                "status VARCHAR(255), " +
                "requested_at TIMESTAMP, " +
                "decided_at TIMESTAMP, " +
                "decided_by VARCHAR(255))");
        } catch (Exception e) {
            System.err.println(">>> [STARTUP] Warning: Could not initialize database schemas: " + e.getMessage());
        }
    }

    @Transactional
    public WorkflowInstance initiateWorkflow(AppUser creator, WorkflowRequestDTO request) {
        Form form = formRepository.findById(request.getFormId())
                .orElseThrow(() -> new RuntimeException("Form not found"));
        
        AppUser targetBuilder = userRepository.findById(request.getTargetBuilderId())
                .orElseThrow(() -> new RuntimeException("Target Builder not found"));

        // Safety: Check if an active workflow already exists for this form
        instanceRepository.findByFormIdAndStatus(form.getId(), WorkflowInstance.WorkflowStatus.ACTIVE)
                .stream().findFirst().ifPresent(existing -> {
                    throw new RuntimeException("Form already has an active approval workflow in progress.");
                });

        // Update Form Status
        if (form.getStatus() == FormStatus.DRAFT || form.getStatus() == FormStatus.REJECTED) {
            form.setStatus(FormStatus.PENDING_PUBLISH);
        } else {
            form.setStatus(FormStatus.PENDING_DRAFT);
        }
        formRepository.save(form);

        // Create Instance
        WorkflowInstance instance = WorkflowInstance.builder()
                .form(form)
                .creator(creator)
                .targetBuilder(targetBuilder)
                .currentStepIndex(1)
                .totalSteps(request.getIntermediateAuthorityIds().size() + 1)
                .status(WorkflowInstance.WorkflowStatus.ACTIVE)
                .steps(new ArrayList<>())
                .build();

        instance = instanceRepository.save(instance);

        // Create Intermediate Steps
        int stepIdx = 1;
        for (UUID authId : request.getIntermediateAuthorityIds()) {
            AppUser auth = userRepository.findById(authId)
                    .orElseThrow(() -> new RuntimeException("Authority user not found: " + authId));
            
            WorkflowStep step = WorkflowStep.builder()
                    .instance(instance)
                    .approver(auth)
                    .stepIndex(stepIdx++)
                    .status(WorkflowStep.StepStatus.PENDING)
                    .build();
            stepRepository.save(step);
        }

        // Final Step (Builder)
        WorkflowStep finalStep = WorkflowStep.builder()
                .instance(instance)
                .approver(targetBuilder)
                .stepIndex(stepIdx)
                .status(WorkflowStep.StepStatus.PENDING)
                .build();
        stepRepository.save(finalStep);

        auditService.log("WORKFLOW_INITIATE", creator.getUsername(), "WORKFLOW", instance.getId().toString(), 
            "Workflow initiated for form: '" + form.getName() + "' (Target: " + targetBuilder.getUsername() + ")");
        return instance;
    }

    @Transactional
    public void approveStep(UUID stepId, String comments, AppUser actor) {
        WorkflowStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found"));
        
        if (!step.getApprover().getId().equals(actor.getId())) {
            throw new RuntimeException("Unauthorized: Not the assigned approver");
        }

        step.setStatus(WorkflowStep.StepStatus.APPROVED);
        step.setComments(comments);
        step.setDecidedAt(LocalDateTime.now());
        stepRepository.save(step);

        // Update Approval Chain on Form
        Form form = step.getInstance().getForm();
        String currentChain = form.getApprovalChain();
        String newChain = (currentChain == null || currentChain.isBlank()) ? actor.getUsername() : currentChain + ", " + actor.getUsername();
        form.setApprovalChain(newChain);
        formRepository.save(form);

        auditService.log("WORKFLOW_APPROVE", actor.getUsername(), "WORKFLOW", step.getInstance().getId().toString(), 
            "Step " + step.getStepIndex() + " approved for form: '" + form.getName() + "'");

        WorkflowInstance instance = step.getInstance();
        if (step.getStepIndex() < instance.getTotalSteps()) {
            instance.setCurrentStepIndex(step.getStepIndex() + 1);
            instanceRepository.save(instance);
        } else {
            // Final Step Approved -> Adopt!
            instance.setStatus(WorkflowInstance.WorkflowStatus.COMPLETED);
            instance.setUpdatedAt(LocalDateTime.now());
            instanceRepository.save(instance);

            formWorkflowService.finalizeWorkflowForm(instance.getForm().getId(), instance.getTargetBuilder(), actor);
        }
    }

    @Transactional
    public void rejectStep(UUID stepId, String comments, AppUser actor) {
        WorkflowStep step = stepRepository.findById(stepId)
                .orElseThrow(() -> new RuntimeException("Step not found"));

        if (!step.getApprover().getId().equals(actor.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        step.setStatus(WorkflowStep.StepStatus.REJECTED);
        step.setComments(comments);
        step.setDecidedAt(LocalDateTime.now());
        stepRepository.save(step);

        WorkflowInstance instance = step.getInstance();
        instance.setUpdatedAt(LocalDateTime.now());
        instanceRepository.save(instance);

        auditService.log("WORKFLOW_REJECT", actor.getUsername(), "WORKFLOW", instance.getId().toString(), 
            "Workflow rejected at step " + step.getStepIndex() + " for form: '" + instance.getForm().getName() + "'");

        Form form = instance.getForm();
        form.setStatus(FormStatus.REJECTED);
        formRepository.save(form);
    }

    @Transactional
    public void rejectWorkflowsForUser(AppUser user) {
        // Find all active steps where this user is an approver
        List<WorkflowStep> steps = stepRepository.findAll().stream()
                .filter(s -> s.getApprover().getId().equals(user.getId()) && s.getStatus() == WorkflowStep.StepStatus.PENDING)
                .toList();

        for (WorkflowStep step : steps) {
            WorkflowInstance instance = step.getInstance();
            if (instance.getStatus() == WorkflowInstance.WorkflowStatus.ACTIVE) {
                // Reject the whole instance
                instance.setStatus(WorkflowInstance.WorkflowStatus.REJECTED);
                instance.setUpdatedAt(LocalDateTime.now());
                instanceRepository.save(instance);

                Form form = instance.getForm();
                form.setStatus(FormStatus.REJECTED);
                formRepository.save(form);

                // Update the step status too for clarity
                step.setStatus(WorkflowStep.StepStatus.REJECTED);
                step.setComments("Authority was deleted from the system.");
                step.setDecidedAt(LocalDateTime.now());
                stepRepository.save(step);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDTO> getAvailableAuthorities(UUID formId) {
        return userRepository.findAll().stream()
                .filter(user -> {
                    // Always show users with Global roles
                    boolean hasGlobal = user.getUserFormRoles().stream().anyMatch(ufr -> ufr.getFormId() == null);
                    if (hasGlobal) return true;
                    
                    // If formId is provided, also show users who have a role for THIS form
                    if (formId != null) {
                        return user.getUserFormRoles().stream().anyMatch(ufr -> formId.equals(ufr.getFormId()));
                    }
                    
                    return false;
                })
                .map(user -> UserSummaryDTO.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .roles(user.getUserFormRoles().stream()
                                .filter(ufr -> ufr.getFormId() == null || (formId != null && formId.equals(ufr.getFormId())))
                                .map(ufr -> ufr.getRole().getName() + (ufr.getFormId() != null ? " (Scoped)" : " (Global)"))
                                .collect(java.util.stream.Collectors.toSet()))
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkflowStep> getPendingStepsForUser(AppUser user) {
        return stepRepository.findPendingStepsForUser(
            user.getId(), 
            WorkflowStep.StepStatus.PENDING, 
            WorkflowInstance.WorkflowStatus.ACTIVE
        );
    }

    @Transactional(readOnly = true)
    public List<WorkflowInstance> getWorkflowsCreatedByUser(AppUser creator) {
        return instanceRepository.findByCreatorOrderByCreatedAtDesc(creator);
    }

    @Transactional(readOnly = true)
    public List<WorkflowInstance> getWorkflowsHandledByUser(AppUser actor) {
        return stepRepository.findInstancesHandledByUser(actor.getId());
    }
}
