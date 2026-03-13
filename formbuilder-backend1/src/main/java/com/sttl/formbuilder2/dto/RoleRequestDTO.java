package com.sttl.formbuilder2.dto;

import lombok.Data;
import java.util.Set;

@Data
public class RoleRequestDTO {
    private String name;
    private String description;
    private Set<Long> permissionIds;
}
