package com.sttl.formbuilder2.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Set;

@Data
@Builder
public class UserAssignmentDTO {
    private Long id;
    private Long formId;
    private RoleInfo role;

    @Data
    @Builder
    public static class RoleInfo {
        private Long id;
        private String name;
        private Set<PermissionInfo> permissions;
    }

    @Data
    @Builder
    public static class PermissionInfo {
        private Long id;
        private String name;
    }
}
