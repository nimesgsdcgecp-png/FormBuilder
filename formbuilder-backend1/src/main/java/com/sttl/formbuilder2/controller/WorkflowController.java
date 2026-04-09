package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.request.WorkflowRequestDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import com.sttl.formbuilder2.model.entity.WorkflowStep;
import com.sttl.formbuilder2.repository.UserRepository;
import com.sttl.formbuilder2.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import com.sttl.formbuilder2.util.ApiConstants;

import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping(ApiConstants.WORKFLOW_BASE)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "feature.workflow.enabled", havingValue = "true")
public class WorkflowController {

    private final WorkflowService workflowService;
    private final UserRepository userRepository;

    @PostMapping(ApiConstants.WORKFLOW_INITIATE)
    public ResponseEntity<?> initiate(@RequestBody WorkflowRequestDTO request, @AuthenticationPrincipal UserDetails userDetails) {
        AppUser creator = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        WorkflowInstance instance = workflowService.initiateWorkflow(creator, request);
        return ResponseEntity.ok(Map.of(
            "message", "Workflow initiated successfully",
            "id", instance.getId(),
            "status", instance.getStatus().name()
        ));
    }

    @PostMapping(ApiConstants.WORKFLOW_APPROVE)
    public ResponseEntity<?> approve(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser actor = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            workflowService.approveStep(id, payload.get("comments"), actor);
            return ResponseEntity.ok(Map.of("message", "Step approved successfully"));
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            if (msg.contains("Unauthorized") || msg.contains("assigned approver")) {
                return ResponseEntity.status(403).body(Map.of("error", msg));
            }
            if (msg.contains("not found")) {
                return ResponseEntity.status(404).body(Map.of("error", msg));
            }
            System.err.println(">>> RuntimeException in approve: " + msg);
            return ResponseEntity.status(400).body(Map.of("error", msg));
        } catch (Exception e) {
            System.err.println(">>> Unexpected Error in approve: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @PostMapping(ApiConstants.WORKFLOW_REJECT)
    public ResponseEntity<?> reject(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload, @AuthenticationPrincipal UserDetails userDetails) {
        AppUser actor = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        workflowService.rejectStep(id, payload.get("comments"), actor);
        return ResponseEntity.ok(Map.of("message", "Workflow rejected"));
    }

    @GetMapping(ApiConstants.WORKFLOW_AUTHORITIES)
    public ResponseEntity<?> getAvailableAuthorities(@RequestParam(value = "formId", required = false) UUID formId) {
        return ResponseEntity.ok(workflowService.getAvailableAuthorities(formId));
    }

    @GetMapping(ApiConstants.WORKFLOW_FIX_DB)
    public ResponseEntity<?> fixDb() {
        try {
            workflowService.fixDatabaseConstraints();
            return ResponseEntity.ok(Map.of("message", "Database constraints fixed manually"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping(ApiConstants.WORKFLOW_MY_SUBMISSIONS)
    public ResponseEntity<?> getMySubmissions(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser creator = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<WorkflowInstance> instances = workflowService.getWorkflowsCreatedByUser(creator);
            
            List<Map<String, Object>> response = instances.stream().map(this::mapInstanceToDetailedMap).toList();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping(ApiConstants.WORKFLOW_MY_HANDLED)
    public ResponseEntity<?> getMyHandledWorkflows(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser actor = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<WorkflowInstance> instances = workflowService.getWorkflowsHandledByUser(actor);
            
            List<Map<String, Object>> response = instances.stream().map(this::mapInstanceToDetailedMap).toList();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping(ApiConstants.WORKFLOW_MY_PENDING)
    public ResponseEntity<?> getMyPendingSteps(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser actor = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            List<WorkflowStep> steps = workflowService.getPendingStepsForUser(actor);
            
            List<Map<String, Object>> response = steps.stream().map(step -> {
                Map<String, Object> stepMap = new HashMap<>();
                stepMap.put("id", step.getId());
                stepMap.put("stepIndex", step.getStepIndex());
                stepMap.put("status", step.getStatus().name());
                stepMap.put("instance", mapInstanceToDetailedMap(step.getInstance()));
                return stepMap;
            }).toList();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> mapInstanceToDetailedMap(WorkflowInstance instance) {
        Form form = instance.getForm();
        
        Map<String, Object> formMap = new HashMap<>();
        formMap.put("id", form.getId());
        formMap.put("title", form.getName());
        formMap.put("description", form.getDescription() == null ? "" : form.getDescription());

        Map<String, Object> creatorMap = new HashMap<>();
        creatorMap.put("username", instance.getCreator().getUsername());

        List<Map<String, Object>> stepHistory = instance.getSteps().stream().map(s -> {
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("id", s.getId());
            sMap.put("stepIndex", s.getStepIndex());
            sMap.put("status", s.getStatus().name());
            sMap.put("approver", s.getApprover().getUsername());
            
            // Add roles in brackets style for easier display
            String rolesStr = s.getApprover().getUserFormRoles().stream()
                .map(ufr -> ufr.getRole().getName())
                .collect(java.util.stream.Collectors.joining(", "));
            sMap.put("approverRole", rolesStr);
            
            sMap.put("comments", s.getComments());
            sMap.put("decidedAt", s.getDecidedAt());
            return sMap;
        }).toList();

        Map<String, Object> instanceMap = new HashMap<>();
        instanceMap.put("id", instance.getId());
        instanceMap.put("currentStepIndex", instance.getCurrentStepIndex());
        instanceMap.put("totalSteps", instance.getTotalSteps());
        instanceMap.put("status", instance.getStatus().name());
        instanceMap.put("createdAt", instance.getCreatedAt());
        instanceMap.put("updatedAt", instance.getUpdatedAt());
        instanceMap.put("form", formMap);
        instanceMap.put("creator", creatorMap);
        instanceMap.put("history", stepHistory);
        
        return instanceMap;
    }
}
