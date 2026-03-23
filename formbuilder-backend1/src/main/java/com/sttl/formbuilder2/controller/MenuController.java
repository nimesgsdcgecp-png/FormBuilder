package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.response.MenuDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.repository.UserRepository;
import com.sttl.formbuilder2.service.ModuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/menu")
@RequiredArgsConstructor
public class MenuController {

    private final ModuleService moduleService;
    private final UserRepository userRepository;

    @GetMapping
    public List<MenuDTO> getLoggedInUserMenu() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return new ArrayList<>();
        }

        String username = auth.getName();
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get unique role IDs for the user
        Set<Long> roleIds = user.getUserFormRoles().stream()
                .map(ufr -> ufr.getRole().getId())
                .collect(Collectors.toSet());

        // For simplicity, we aggregate modules from all roles
        // Alternatively, we could filter by global roles (formId == null)
        
        Set<MenuDTO> allRootMenus = new HashSet<>();
        for (Long roleId : roleIds) {
            allRootMenus.addAll(moduleService.getMenuForRole(roleId));
        }

        // Return as a sorted list if needed, or just a list
        return new ArrayList<>(allRootMenus);
    }
}
