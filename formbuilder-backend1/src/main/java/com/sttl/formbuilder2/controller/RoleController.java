package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.*;
import com.sttl.formbuilder2.service.RoleService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/roles")
@PreAuthorize("hasAuthority('MANAGE')")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<Page<RoleResponseDTO>> getAllRoles(Pageable pageable) {
        return ResponseEntity.ok(roleService.getAllRoles(pageable));
    }

    @PostMapping
    public ResponseEntity<?> createRole(@RequestBody RoleRequestDTO dto, Authentication auth) {
        try {
            return ResponseEntity.ok(roleService.createRole(dto, auth.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRole(@PathVariable("id") Long id, @RequestBody RoleRequestDTO dto) {
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
    public ResponseEntity<?> removeAssignment(@PathVariable("id") Long id) {
        roleService.removeAssignment(id);
        return ResponseEntity.ok(Map.of("message", "Assignment removed"));
    }

    @GetMapping("/users/{userId}/assignments")
    public ResponseEntity<List<UserRoleAssignmentResponseDTO>> getUserAssignments(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(roleService.getUserAssignments(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRole(@PathVariable("id") Long id) {
        try {
            roleService.deleteRole(id);
            return ResponseEntity.ok(Map.of("message", "Role deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
