package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.service.RoleModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@org.springframework.security.access.prepost.PreAuthorize("hasAuthority('MANAGE')")
public class RoleModuleController {

    private final RoleModuleService roleModuleService;

    @PostMapping("/{roleId}/modules")
    public org.springframework.http.ResponseEntity<?> assignModulesToRole(
            @PathVariable("roleId") Long roleId, 
            @RequestBody java.util.Map<String, java.util.List<Long>> payload) {
        try {
            roleModuleService.assignModulesToRole(roleId, payload.get("moduleIds"));
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Success"));
        } catch (Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.internalServerError()
                .body(java.util.Map.of("error", e.getMessage(), "type", e.getClass().getName()));
        }
    }

    @GetMapping("/{roleId}/modules")
    public org.springframework.http.ResponseEntity<?> getModulesByRole(@PathVariable("roleId") Long roleId) {
        try {
            return org.springframework.http.ResponseEntity.ok(roleModuleService.getModulesByRole(roleId));
        } catch (Exception e) {
            e.printStackTrace();
            return org.springframework.http.ResponseEntity.internalServerError()
                .body(java.util.Map.of("error", e.getMessage(), "type", e.getClass().getName()));
        }
    }
}
