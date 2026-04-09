package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.service.AuditService;
import com.sttl.formbuilder2.util.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.ADMIN_AUDIT_BASE)
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping(ApiConstants.ADMIN_AUDIT_LIST)
    @PreAuthorize("hasRole('ADMIN') or hasRole('ROLE_ADMINISTRATOR') or hasRole('ROLE_ADMIN') or hasAuthority('MANAGE')")
    public ResponseEntity<?> getLogs() {
        try {
            return ResponseEntity.ok(auditService.getAllLogs());
        } catch (Exception e) {
            System.err.println("!!! AUDIT ERROR: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error fetching audit logs: " + e.getMessage());
        }
    }

    @DeleteMapping("/clear")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> clearLogs() {
        try {
            auditService.clearLogs();
            return ResponseEntity.ok("Audit logs cleared successfully (Soft Delete)");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error clearing audit logs: " + e.getMessage());
        }
    }
}
