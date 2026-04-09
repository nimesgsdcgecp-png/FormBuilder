package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.model.entity.Module;
import com.sttl.formbuilder2.service.ModuleService;
import com.sttl.formbuilder2.util.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.MODULES_BASE)
@PreAuthorize("hasAuthority('MANAGE') or hasRole('ADMIN') or hasRole('ROLE_ADMINISTRATOR') or hasRole('ROLE_ADMIN')")
@RequiredArgsConstructor
public class ModuleController {

    private final ModuleService moduleService;

    @GetMapping(ApiConstants.MODULES_LIST)
    public List<Module> getAllModules() {
        return moduleService.getAllModules();
    }

    @PostMapping(ApiConstants.MODULES_LIST)
    public Module createModule(@RequestBody Module module) {
        return moduleService.createModule(module);
    }

    @PutMapping("/{id}")
    public Module updateModule(@PathVariable("id") UUID id, @RequestBody Module module) {
        return moduleService.updateModule(id, module);
    }

    @DeleteMapping("/{id}")
    public void deleteModule(@PathVariable("id") UUID id) {
        moduleService.deleteModule(id);
    }
}
