package com.sttl.formbuilder2.dto.response;

import java.util.UUID;

import lombok.Builder;
import lombok.Data;
import java.util.Set;

@Data
@Builder
public class UserAssignmentDTO {
    private UUID id;
    private UUID formId;
    private RoleInfo role;

    @Data
    @Builder
    public static class RoleInfo {
        private UUID id;
        private String name;
        private Set<PermissionInfo> permissions;
    }

    @Data
    @Builder
    public static class PermissionInfo {
        private UUID id;
        private String name;
    }
}
