package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.response.UserResponseDTO;
import com.sttl.formbuilder2.dto.response.UserSummaryDTO;
import com.sttl.formbuilder2.service.UserService;
import com.sttl.formbuilder2.util.ApiConstants;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping(ApiConstants.ADMIN_USERS_BASE)
@PreAuthorize("hasAuthority('MANAGE')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping(ApiConstants.ADMIN_USERS_LIST)
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/summary")
    public ResponseEntity<List<UserSummaryDTO>> getUserSummaries() {
        return ResponseEntity.ok(userService.getUserSummaries());
    }

    @DeleteMapping(ApiConstants.ADMIN_USERS_DELETE)
    public ResponseEntity<?> deleteUser(@PathVariable("id") UUID id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping(ApiConstants.ADMIN_USERS_UPDATE)
    public ResponseEntity<?> updateUser(@PathVariable("id") UUID id, @RequestBody Map<String, Object> payload) {
        try {
            UUID roleId = null;
            if (payload.get("roleId") != null) {
                roleId = UUID.fromString(payload.get("roleId").toString());
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
