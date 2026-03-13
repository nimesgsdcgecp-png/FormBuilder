package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.UserResponseDTO;
import com.sttl.formbuilder2.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasAuthority('MANAGE')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/summary")
    public ResponseEntity<List<com.sttl.formbuilder2.dto.UserSummaryDTO>> getUserSummaries() {
        return ResponseEntity.ok(userService.getUserSummaries());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable("id") Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable("id") Long id, @RequestBody Map<String, Object> payload) {
        try {
            Long roleId = null;
            if (payload.get("roleId") != null) {
                roleId = Long.valueOf(payload.get("roleId").toString());
            }

            userService.updateUser(
                id,
                (String) payload.get("username"),
                (String) payload.get("password"),
                roleId
            );
            return ResponseEntity.ok(Map.of("message", "User updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/default-role")
    public ResponseEntity<Map<String, String>> getDefaultRole() {
        return ResponseEntity.ok(Map.of("roleName", userService.getDefaultRole()));
    }

    @PostMapping("/default-role")
    public ResponseEntity<?> updateDefaultRole(@RequestBody Map<String, String> payload) {
        try {
            userService.updateDefaultRole(payload.get("roleName"));
            return ResponseEntity.ok(Map.of("message", "Default role updated"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
