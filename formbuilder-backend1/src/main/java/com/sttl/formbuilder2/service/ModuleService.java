package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.MenuDTO;
import com.sttl.formbuilder2.model.entity.Module;
import com.sttl.formbuilder2.model.entity.RoleModule;
import com.sttl.formbuilder2.repository.ModuleRepository;
import com.sttl.formbuilder2.repository.RoleModuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final RoleModuleRepository roleModuleRepository;

    public List<Module> getAllModules() {
        return moduleRepository.findAll();
    }

    public Module createModule(Module module) {
        return moduleRepository.save(module);
    }

    public Module updateModule(Long id, Module moduleDetails) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Module not found with id: " + id));
        
        module.setModuleName(moduleDetails.getModuleName());
        module.setPrefix(moduleDetails.getPrefix());
        module.setIsParent(moduleDetails.getIsParent());
        module.setIsSubParent(moduleDetails.getIsSubParent());
        module.setParentId(moduleDetails.getParentId());
        module.setSubParentId(moduleDetails.getSubParentId());
        module.setMenuIconCss(moduleDetails.getMenuIconCss());
        module.setActive(moduleDetails.getActive());
        
        return moduleRepository.save(module);
    }

    @Transactional
    public void deleteModule(Long id) {
        // First delete role mappings
        roleModuleRepository.deleteByModuleId(id);
        // Then delete the module
        moduleRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<MenuDTO> getMenuForRole(Long roleId) {
        List<RoleModule> roleModules = roleModuleRepository.findByRoleIdAndModuleActiveTrue(roleId);
        List<Module> modules = roleModules.stream()
                .map(RoleModule::getModule)
                .collect(Collectors.toList());

        return buildMenuTree(modules);
    }

    private List<MenuDTO> buildMenuTree(List<Module> modules) {
        // Map Modules to MenuDTOs
        Map<Long, MenuDTO> dtoMap = modules.stream().collect(Collectors.toMap(
                Module::getId,
                this::convertToDTO
        ));

        List<MenuDTO> rootMenu = new ArrayList<>();

        for (Module m : modules) {
            MenuDTO currentDTO = dtoMap.get(m.getId());
            
            if (m.getSubParentId() != null && dtoMap.containsKey(m.getSubParentId())) {
                // It's a Level 3 (SubModule)
                dtoMap.get(m.getSubParentId()).addChild(currentDTO);
            } else if (m.getParentId() != null && dtoMap.containsKey(m.getParentId())) {
                // It's a Level 2 (SubParent)
                dtoMap.get(m.getParentId()).addChild(currentDTO);
            } else if (Boolean.TRUE.equals(m.getIsParent())) {
                // It's a Level 1 (Parent)
                rootMenu.add(currentDTO);
            } else {
                // Standalone or orphan (add to root if no parent specified or parent not in role)
                if (m.getParentId() == null) {
                    rootMenu.add(currentDTO);
                }
            }
        }

        return rootMenu;
    }

    private MenuDTO convertToDTO(Module module) {
        MenuDTO dto = new MenuDTO();
        dto.setId(module.getId());
        dto.setName(module.getModuleName());
        dto.setUrl(module.getPrefix());
        dto.setIcon(module.getMenuIconCss());
        return dto;
    }
}
