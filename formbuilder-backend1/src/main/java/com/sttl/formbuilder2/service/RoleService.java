package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.RoleAssignmentDTO;
import com.sttl.formbuilder2.dto.request.RoleRequestDTO;
import com.sttl.formbuilder2.dto.response.PermissionResponseDTO;
import com.sttl.formbuilder2.dto.response.RoleResponseDTO;
import com.sttl.formbuilder2.dto.response.UserRoleAssignmentResponseDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.entity.Permission;
import com.sttl.formbuilder2.model.entity.Role;
import com.sttl.formbuilder2.model.entity.UserFormRole;
import com.sttl.formbuilder2.repository.PermissionRepository;
import com.sttl.formbuilder2.repository.RoleModuleRepository;
import com.sttl.formbuilder2.repository.RoleRepository;
import com.sttl.formbuilder2.repository.UserFormRoleRepository;
import com.sttl.formbuilder2.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserFormRoleRepository userFormRoleRepository;
    private final RoleModuleRepository roleModuleRepository;
    private final UserRepository userRepository;

    public RoleService(RoleRepository roleRepository,
                       PermissionRepository permissionRepository,
                       UserFormRoleRepository userFormRoleRepository,
                       RoleModuleRepository roleModuleRepository,
                       UserRepository userRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userFormRoleRepository = userFormRoleRepository;
        this.roleModuleRepository = roleModuleRepository;
        this.userRepository = userRepository;
    }

    public Page<RoleResponseDTO> getAllRoles(Pageable pageable) {
        return roleRepository.findAll(pageable).map(this::convertToDTO);
    }

    @Transactional
    public RoleResponseDTO createRole(RoleRequestDTO dto, String createdBy) {
        if (roleRepository.findByName(dto.getName()).isPresent()) {
            throw new RuntimeException("Role already exists: " + dto.getName());
        }

        Role role = new Role();
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        role.setCreatedBy(createdBy);
        role.setCreatedAt(LocalDateTime.now());

        if (dto.getPermissionIds() != null) {
            Set<Permission> perms = dto.getPermissionIds().stream()
                    .map(id -> permissionRepository.findById(id).orElse(null))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            role.setPermissions(perms);
        }

        return convertToDTO(roleRepository.save(role));
    }

    @Transactional
    public RoleResponseDTO updateRole(UUID id, RoleRequestDTO dto) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        List<String> protectedRoles = List.of("ADMIN", "ROLE_ADMINISTRATOR", "BUILDER", "USER");
        if (protectedRoles.contains(role.getName())) {
            throw new RuntimeException("Cannot edit protected system role: " + role.getName());
        }

        // Check if new name conflict
        roleRepository.findByName(dto.getName()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new RuntimeException("Role name already exists: " + dto.getName());
            }
        });

        role.setName(dto.getName());
        role.setDescription(dto.getDescription());

        if (dto.getPermissionIds() != null) {
            Set<Permission> perms = dto.getPermissionIds().stream()
                    .map(permId -> permissionRepository.findById(permId)
                            .orElseThrow(() -> new RuntimeException("Permission not found: " + permId)))
                    .collect(Collectors.toSet());
            role.setPermissions(perms);
        }

        return convertToDTO(roleRepository.save(role));
    }

    @Transactional
    public void assignRole(RoleAssignmentDTO dto, String assignedBy) {
        AppUser user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Role role = roleRepository.findById(dto.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        // If it's a global assignment (formId is null)
        if (dto.getFormId() == null) {
            // Restriction: ADMIN and ROLE_ADMINISTRATOR should only have one instance globally
            if (role.getName().equals("ADMIN") || role.getName().equals("ROLE_ADMINISTRATOR")) {
                boolean alreadyAssigned = userFormRoleRepository.findAll().stream()
                        .anyMatch(ufr -> ufr.getRole().getName().equals(role.getName()) && ufr.getFormId() == null && !ufr.getUser().getId().equals(user.getId()));
                
                if (alreadyAssigned) {
                    throw new RuntimeException("System restricted: only one instance of " + role.getName() + " is allowed.");
                }
            }

            // Remove existing global roles for this user before adding new one
            List<UserFormRole> existingGlobal = user.getUserFormRoles().stream()
                .filter(ufr -> ufr.getFormId() == null)
                .collect(Collectors.toList());
            
            for (UserFormRole ufr : existingGlobal) {
                user.getUserFormRoles().remove(ufr);
                userFormRoleRepository.delete(ufr);
            }
        } else {
            // If it's a scoped assignment, check if this specific (user, role, form) combination already exists
            boolean exists = user.getUserFormRoles().stream()
                .anyMatch(ufr -> ufr.getRole().getId().equals(role.getId()) && Objects.equals(ufr.getFormId(), dto.getFormId()));
            
            if (exists) {
                return; // Already assigned, do nothing
            }
        }

        UserFormRole assignment = new UserFormRole();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setFormId(dto.getFormId());
        assignment.setAssignedBy(assignedBy);
        assignment.setAssignedAt(LocalDateTime.now());

        // Maintain bidirectional consistency
        user.getUserFormRoles().add(assignment);
        userFormRoleRepository.save(assignment);
    }

    @Transactional
    public void deleteRole(UUID id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        List<String> protectedRoles = List.of("ADMIN", "ROLE_ADMINISTRATOR", "BUILDER", "USER");
        if (protectedRoles.contains(role.getName())) {
            throw new RuntimeException("Cannot delete protected system role: " + role.getName());
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new RuntimeException("Fallback role 'USER' not found"));

        // Clear role-module mappings first to avoid FK violation
        roleModuleRepository.deleteByRoleId(id);

        // Reassign all users holding this role to USER
        List<UserFormRole> assignments = userFormRoleRepository.findByRoleId(role.getId());
        for (UserFormRole assignment : assignments) {
            assignment.setRole(userRole);
            userFormRoleRepository.save(assignment);
        }

        // Nullify parentRole references from children
        List<Role> children = roleRepository.findAll().stream()
                .filter(r -> r.getParentRole() != null && r.getParentRole().getId().equals(role.getId()))
                .collect(Collectors.toList());
        for (Role child : children) {
            child.setParentRole(null);
            roleRepository.save(child);
        }

        roleRepository.delete(role);
    }

    @Transactional
    public void removeAssignment(UUID id) {
        userFormRoleRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserRoleAssignmentResponseDTO> getUserAssignments(UUID userId) {
        return userFormRoleRepository.findByUserId(userId).stream()
                .map(ufr -> UserRoleAssignmentResponseDTO.builder()
                        .id(ufr.getId())
                        .role(UserRoleAssignmentResponseDTO.RoleInfo.builder()
                                .id(ufr.getRole().getId())
                                .name(ufr.getRole().getName())
                                .build())
                        .formId(ufr.getFormId())
                        .build())
                .collect(Collectors.toList());
    }

    private RoleResponseDTO convertToDTO(Role role) {
        RoleResponseDTO dto = new RoleResponseDTO();
        dto.setId(role.getId());
        dto.setName(role.getName());
        dto.setDescription(role.getDescription());
        dto.setPermissions(role.getPermissions().stream()
                .map(p -> {
                    PermissionResponseDTO pDto = new PermissionResponseDTO();
                    pDto.setId(p.getId());
                    pDto.setName(p.getName());
                    pDto.setCategory(p.getCategory());
                    return pDto;
                }).collect(Collectors.toSet()));
        return dto;
    }
}
