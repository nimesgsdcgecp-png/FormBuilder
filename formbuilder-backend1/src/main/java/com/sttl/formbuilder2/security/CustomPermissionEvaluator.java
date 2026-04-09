package com.sttl.formbuilder2.security;

import java.util.UUID;

import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.repository.UserRepository;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Component
public class CustomPermissionEvaluator implements PermissionEvaluator {

    private final UserRepository userRepository;

    public CustomPermissionEvaluator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (authentication == null || targetDomainObject == null || !(permission instanceof String)) {
            return false;
        }
        // This method can be implemented if passing the actual target object
        return false;
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType, Object permission) {
        if (authentication == null || targetId == null || targetType == null || !(permission instanceof String)) {
            return false;
        }

        AppUser user = userRepository.findByUsername(authentication.getName())
                .orElse(null);
        
        if (user == null) return false;

        String permissionName = (String) permission;

        if ("FORM".equalsIgnoreCase(targetType)) {
            UUID formId = (UUID) targetId;
            return user.hasPermission(permissionName, formId);
        }

        // Generic global check
        return user.hasPermission(permissionName, null);
    }
}
