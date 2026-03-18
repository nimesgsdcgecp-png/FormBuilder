package com.sttl.formbuilder2.dto.request;

import lombok.Data;
import java.util.Set;

@Data
public class RoleRequestDTO {
    private String name;
    private String description;
    private Set<Long> permissionIds;
}
