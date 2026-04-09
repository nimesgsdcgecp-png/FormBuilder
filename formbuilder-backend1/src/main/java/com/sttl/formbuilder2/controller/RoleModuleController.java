package com.sttl.formbuilder2.controller;

import java.util.UUID;

import com.sttl.formbuilder2.service.RoleModuleService;
import com.sttl.formbuilder2.util.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.ROLE_MODULES_BASE)
@RequiredArgsConstructor
@org.springframework.security.access.prepost.PreAuthorize("hasAuthority('MANAGE') or hasRole('ADMIN') or hasRole('ROLE_ADMINISTRATOR') or hasRole('ROLE_ADMIN')")
public class RoleModuleController {

    private final RoleModuleService roleModuleService;

    @PostMapping(ApiConstants.ROLE_MODULES_ASSIGN)
    public org.springframework.http.ResponseEntity<?> assignModulesToRole(
            @PathVariable("roleId") UUID roleId, 
            @RequestBody java.util.Map<String, java.util.List<UUID>> payload) {
        try {
            roleModuleService.assignModulesToRole(roleId, payload.get("moduleIds"));
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Success"));
        } catch (Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.internalServerError()
                .body(java.util.Map.of("error", e.getMessage(), "type", e.getClass().getName()));
        }
    }

    @GetMapping(ApiConstants.ROLE_MODULES_GET)
    public org.springframework.http.ResponseEntity<?> getModulesByRole(@PathVariable("roleId") UUID roleId) {
        try {
            return org.springframework.http.ResponseEntity.ok(roleModuleService.getModulesByRole(roleId));
        } catch (Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.internalServerError()
                .body(java.util.Map.of("error", e.getMessage(), "type", e.getClass().getName()));
        }
    }
}
