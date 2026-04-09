package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.response.*;
import com.sttl.formbuilder2.model.entity.Permission;
import com.sttl.formbuilder2.repository.PermissionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

import java.util.stream.Collectors;

@Service
public class PermissionService {

    private final PermissionRepository permissionRepository;

    public PermissionService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    public List<PermissionResponseDTO> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private PermissionResponseDTO convertToDTO(Permission permission) {
        PermissionResponseDTO dto = new PermissionResponseDTO();
        dto.setId(permission.getId());
        dto.setName(permission.getName());
        dto.setCategory(permission.getCategory());
        return dto;
    }
}
