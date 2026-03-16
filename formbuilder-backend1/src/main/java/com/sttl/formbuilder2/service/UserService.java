package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.UserAssignmentDTO;
import com.sttl.formbuilder2.dto.UserResponseDTO;
import com.sttl.formbuilder2.model.entity.*;
import com.sttl.formbuilder2.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserFormRoleRepository userFormRoleRepository;
    private final SystemConfigurationRepository systemConfigurationRepository;
    private final WorkflowService workflowService;

    public UserService(UserRepository userRepository, 
                       RoleRepository roleRepository,
                       UserFormRoleRepository userFormRoleRepository,
                       SystemConfigurationRepository systemConfigurationRepository,
                       WorkflowService workflowService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userFormRoleRepository = userFormRoleRepository;
        this.systemConfigurationRepository = systemConfigurationRepository;
        this.workflowService = workflowService;
    }

    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> {
                    UserResponseDTO dto = new UserResponseDTO();
                    dto.setId(user.getId());
                    dto.setUsername(user.getUsername());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Assigns the default role to a user.
     * Usually called after manual registration.
     */
    @Transactional
    public void assignDefaultRole(AppUser user) {
        // Enforce Single Role: Only assign if no roles exist, otherwise clear them
        if (user.getUserFormRoles() != null && !user.getUserFormRoles().isEmpty()) {
            // If we are here, we might want to respect existing roles or clear them.
            // Following the "only single role" rule, we clear if we are assigning a default one.
            user.getUserFormRoles().clear();
            userFormRoleRepository.flush();
        }

        String defaultRoleName = systemConfigurationRepository.findByKey("DEFAULT_REGISTRATION_ROLE")
                .map(SystemConfiguration::getValue)
                .orElse("USER");

        Role defaultRole = roleRepository.findByName(defaultRoleName)
                .orElseGet(() -> roleRepository.findByName("USER")
                        .orElseThrow(() -> new RuntimeException("Fallback role 'USER' not found")));

        UserFormRole assignment = new UserFormRole();
        assignment.setUser(user);
        assignment.setRole(defaultRole);
        assignment.setAssignedBy("SYSTEM");
        assignment.setAssignedAt(LocalDateTime.now());

        userFormRoleRepository.save(assignment);
    }

    @Transactional
    public void deleteUser(Long id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if ("admin".equals(user.getUsername())) {
            throw new RuntimeException("Cannot delete system admin user");
        }

        // Cleanup workflows involving this user
        workflowService.rejectWorkflowsForUser(user);

        // Cleanup role assignments
        userFormRoleRepository.deleteByUserId(id);
        user.getUserFormRoles().clear();
        userFormRoleRepository.flush();

        // Soft delete
        user.setDeleted(true);
        userRepository.save(user);
    }

    @Transactional
    public void updateUser(Long id, String username, String password, Long roleId) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (username != null && !username.isBlank()) {
            // Check if username unique
            userRepository.findByUsername(username).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new RuntimeException("Username already taken");
                }
            });
            user.setUsername(username);
        }

        if (password != null && !password.isBlank()) {
            user.setPasswordHash(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password));
        }

        if (roleId != null) {
            Role role = roleRepository.findById(roleId)
                    .orElseThrow(() -> new RuntimeException("Role not found"));
            
            // Single Role Enforcement
            userFormRoleRepository.deleteByUserId(id);
            user.getUserFormRoles().clear();
            userFormRoleRepository.flush();

            UserFormRole assignment = new UserFormRole();
            assignment.setUser(user);
            assignment.setRole(role);
            assignment.setAssignedBy("ADMIN");
            assignment.setAssignedAt(LocalDateTime.now());
            
            user.getUserFormRoles().add(assignment);
            userFormRoleRepository.save(assignment);
        }

        userRepository.save(user);
    }

    @Transactional
    public void updateDefaultRole(String roleName) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            throw new RuntimeException("Role '" + roleName + "' does not exist");
        }
        
        SystemConfiguration config = systemConfigurationRepository.findByKey("DEFAULT_REGISTRATION_ROLE")
                .orElseGet(() -> SystemConfiguration.builder()
                        .key("DEFAULT_REGISTRATION_ROLE")
                        .build());
        
        config.setValue(roleName);
        systemConfigurationRepository.save(config);
    }

    @Transactional(readOnly = true)
    public List<UserAssignmentDTO> getUserPermissions(String username) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return user.getUserFormRoles().stream()
                .map(ufr -> UserAssignmentDTO.builder()
                        .id(ufr.getId())
                        .formId(ufr.getFormId())
                        .role(UserAssignmentDTO.RoleInfo.builder()
                                .id(ufr.getRole().getId())
                                .name(ufr.getRole().getName())
                                .permissions(ufr.getRole().getPermissions().stream()
                                        .map(p -> UserAssignmentDTO.PermissionInfo.builder()
                                                .id(p.getId())
                                                .name(p.getName())
                                                .build())
                                        .collect(java.util.stream.Collectors.toSet()))
                                .build())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public String getDefaultRole() {
        return systemConfigurationRepository.findByKey("DEFAULT_REGISTRATION_ROLE")
                .map(SystemConfiguration::getValue)
                .orElse("USER");
    }

    @Transactional(readOnly = true)
    public List<com.sttl.formbuilder2.dto.UserSummaryDTO> getUserSummaries() {
        return userRepository.findAll().stream()
                .map(user -> com.sttl.formbuilder2.dto.UserSummaryDTO.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .roles(user.getUserFormRoles().stream()
                                .map(ufr -> ufr.getRole().getName() + (ufr.getFormId() != null ? " (Scoped)" : " (Global)"))
                                .collect(Collectors.toSet()))
                        .build())
                .collect(Collectors.toList());
    }
}
