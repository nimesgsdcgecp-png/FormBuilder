package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.response.PermissionResponseDTO;
import com.sttl.formbuilder2.service.PermissionService;
import com.sttl.formbuilder2.util.ApiConstants;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping(ApiConstants.ADMIN_PERMISSIONS_BASE)
@PreAuthorize("hasAuthority('MANAGE') or hasRole('ADMIN') or hasRole('ROLE_ADMINISTRATOR') or hasRole('ROLE_ADMIN')")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping(ApiConstants.ADMIN_PERMISSIONS_LIST)
    public ResponseEntity<List<PermissionResponseDTO>> getAllPermissions() {
        return ResponseEntity.ok(permissionService.getAllPermissions());
    }
}
