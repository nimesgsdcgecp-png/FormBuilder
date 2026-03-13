package com.sttl.formbuilder2.security;

import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class CustomUserDetailsService implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(CustomUserDetailsService.class);
    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        java.util.Set<org.springframework.security.core.GrantedAuthority> authorities = new java.util.HashSet<>();
        
        // 1. Add granular permissions
        user.getPermissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
        
        // 2. Add roles with ROLE_ prefix
        user.getUserFormRoles().forEach(ufr -> {
            String roleName = ufr.getRole().getName();
            if (!roleName.startsWith("ROLE_")) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));
            } else {
                authorities.add(new SimpleGrantedAuthority(roleName));
            }
        });

        logger.info("User {} logged in with authorities: {}", username, authorities);

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                authorities);
    }
}
