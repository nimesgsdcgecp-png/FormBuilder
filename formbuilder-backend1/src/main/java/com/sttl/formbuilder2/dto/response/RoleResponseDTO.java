package com.sttl.formbuilder2.dto.response;

import lombok.Data;
import java.util.Set;

@Data
public class RoleResponseDTO {
    private Long id;
    private String name;
    private String description;
    private Set<PermissionResponseDTO> permissions;
}
