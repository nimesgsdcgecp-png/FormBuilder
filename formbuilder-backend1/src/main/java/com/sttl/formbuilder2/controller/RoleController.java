package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.request.RoleAssignmentDTO;
import com.sttl.formbuilder2.dto.request.RoleRequestDTO;
import com.sttl.formbuilder2.dto.response.RoleResponseDTO;
import com.sttl.formbuilder2.dto.response.UserRoleAssignmentResponseDTO;
import com.sttl.formbuilder2.service.RoleService;
import com.sttl.formbuilder2.util.ApiConstants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping(ApiConstants.ADMIN_ROLES_BASE)
@PreAuthorize("hasAuthority('MANAGE') or hasRole('ADMIN') or hasRole('ROLE_ADMINISTRATOR') or hasRole('ROLE_ADMIN')")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping(ApiConstants.ADMIN_ROLES_LIST)
    public ResponseEntity<Page<RoleResponseDTO>> getAllRoles(Pageable pageable) {
        return ResponseEntity.ok(roleService.getAllRoles(pageable));
    }

    @PostMapping(ApiConstants.ADMIN_ROLES_CREATE)
    public ResponseEntity<?> createRole(@RequestBody RoleRequestDTO dto, Authentication auth) {
        try {
            return ResponseEntity.ok(roleService.createRole(dto, auth.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping(ApiConstants.ADMIN_ROLES_UPDATE)
    public ResponseEntity<?> updateRole(@PathVariable("id") UUID id, @RequestBody RoleRequestDTO dto) {
        try {
            return ResponseEntity.ok(roleService.updateRole(id, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/assign")
    public ResponseEntity<?> assignRole(@RequestBody RoleAssignmentDTO dto, Authentication auth) {
        try {
            roleService.assignRole(dto, auth.getName());
            return ResponseEntity.ok(Map.of("message", "Role assigned successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<?> removeAssignment(@PathVariable("id") UUID id) {
        roleService.removeAssignment(id);
        return ResponseEntity.ok(Map.of("message", "Assignment removed"));
    }

    @GetMapping("/users/{userId}/assignments")
    public ResponseEntity<List<UserRoleAssignmentResponseDTO>> getUserAssignments(@PathVariable("userId") UUID userId) {
        return ResponseEntity.ok(roleService.getUserAssignments(userId));
    }

    @DeleteMapping(ApiConstants.ADMIN_ROLES_DELETE)
    public ResponseEntity<?> deleteRole(@PathVariable("id") UUID id) {
        try {
            roleService.deleteRole(id);
            return ResponseEntity.ok(Map.of("message", "Role deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
