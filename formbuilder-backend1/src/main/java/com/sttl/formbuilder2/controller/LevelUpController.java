package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.RoleAssignmentDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.entity.LevelUpRequest;
import com.sttl.formbuilder2.model.entity.Role;
import com.sttl.formbuilder2.repository.LevelUpRequestRepository;
import com.sttl.formbuilder2.repository.RoleRepository;
import com.sttl.formbuilder2.repository.UserRepository;
import com.sttl.formbuilder2.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class LevelUpController {

    private final LevelUpRequestRepository levelUpRequestRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RoleService roleService;

    public LevelUpController(LevelUpRequestRepository levelUpRequestRepository,
                             UserRepository userRepository,
                             RoleRepository roleRepository,
                             RoleService roleService) {
        this.levelUpRequestRepository = levelUpRequestRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.roleService = roleService;
    }

    @PostMapping("/profile/level-up")
    public ResponseEntity<?> requestLevelUp(Authentication auth) {
        AppUser user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user is already a builder or admin/administrator
        boolean isPrivileged = user.getUserFormRoles().stream()
                .anyMatch(ufr -> 
                    ufr.getRole().getName().equals("BUILDER") || 
                    ufr.getRole().getName().equals("ADMIN") ||
                    ufr.getRole().getName().equals("ROLE_ADMINISTRATOR")
                );
        
        if (isPrivileged) {
            return ResponseEntity.badRequest().body(Map.of("error", "User already has elevated permissions"));
        }

        // Check for existing pending request
        boolean hasPending = levelUpRequestRepository.findTopByUserIdAndStatusOrderByRequestedAtDesc(user.getId(), "PENDING").isPresent();
        if (hasPending) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request already pending"));
        }

        LevelUpRequest request = new LevelUpRequest();
        request.setUser(user);
        request.setStatus("PENDING");
        request.setRequestedAt(LocalDateTime.now());

        levelUpRequestRepository.save(request);
        return ResponseEntity.ok(Map.of("message", "Request submitted successfully"));
    }

    @GetMapping("/admin/level-up/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRATOR')")
    public ResponseEntity<List<LevelUpRequest>> getPendingRequests() {
        return ResponseEntity.ok(levelUpRequestRepository.findByStatus("PENDING"));
    }

    @PostMapping("/admin/level-up/{id}/action")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRATOR')")
    public ResponseEntity<?> actionRequest(@PathVariable("id") Long id, @RequestBody Map<String, String> payload, Authentication auth) {
        String action = payload.get("action"); // APPROVE or REJECT
        LevelUpRequest request = levelUpRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request already processed"));
        }

        request.setStatus(action.equals("APPROVE") ? "APPROVED" : "REJECTED");
        request.setDecidedAt(LocalDateTime.now());
        request.setDecidedBy(auth.getName());

        if (action.equals("APPROVE")) {
            Role builderRole = roleRepository.findByName("BUILDER")
                    .orElseThrow(() -> new RuntimeException("Role 'BUILDER' not found"));
            
            RoleAssignmentDTO dto = new RoleAssignmentDTO();
            dto.setUserId(request.getUser().getId());
            dto.setRoleId(builderRole.getId());
            dto.setFormId(null); // Global promotion
            
            roleService.assignRole(dto, auth.getName());
        }

        levelUpRequestRepository.save(request);
        return ResponseEntity.ok(Map.of("message", "Request " + action.toLowerCase() + "d successfully"));
    }
}
