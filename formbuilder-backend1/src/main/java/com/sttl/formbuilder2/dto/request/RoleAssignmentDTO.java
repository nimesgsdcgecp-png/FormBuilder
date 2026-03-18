package com.sttl.formbuilder2.dto.request;

import lombok.Data;

@Data
public class RoleAssignmentDTO {
    private Long userId;
    private Long roleId;
    private Long formId;
}
