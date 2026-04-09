package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.model.entity.Module;
import com.sttl.formbuilder2.model.entity.Role;
import com.sttl.formbuilder2.model.entity.RoleModule;
import com.sttl.formbuilder2.repository.ModuleRepository;
import com.sttl.formbuilder2.repository.RoleModuleRepository;
import com.sttl.formbuilder2.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleModuleService {

    private final RoleModuleRepository roleModuleRepository;
    private final RoleRepository roleRepository;
    private final ModuleRepository moduleRepository;

    @Transactional
    public void assignModulesToRole(UUID roleId, List<UUID> moduleIds) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        // Clear existing mappings
        roleModuleRepository.deleteByRoleId(roleId);

        // Assign new mappings
        if (moduleIds == null) return;

        List<RoleModule> mappings = moduleIds.stream()
                .map(moduleId -> {
                    Module module = moduleRepository.findById(moduleId)
                            .orElseThrow(() -> new RuntimeException("Module not found: " + moduleId));
                    return new RoleModule(role, module);
                })
                .collect(Collectors.toList());

        roleModuleRepository.saveAll(mappings);
    }

    @Transactional(readOnly = true)
    public List<Module> getModulesByRole(UUID roleId) {
        return roleModuleRepository.findByRoleId(roleId).stream()
                .map(RoleModule::getModule)
                .collect(Collectors.toList());
    }
}
