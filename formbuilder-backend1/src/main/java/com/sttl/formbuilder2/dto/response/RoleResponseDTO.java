package com.sttl.formbuilder2.dto.response;

import java.util.UUID;

import lombok.Data;
import java.util.Set;

@Data
public class RoleResponseDTO {
    private UUID id;
    private String name;
    private String description;
    private Set<PermissionResponseDTO> permissions;
}
