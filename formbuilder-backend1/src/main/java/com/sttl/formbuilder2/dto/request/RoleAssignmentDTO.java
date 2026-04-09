package com.sttl.formbuilder2.dto.request;

import java.util.UUID;

import lombok.Data;

@Data
public class RoleAssignmentDTO {
    private UUID userId;
    private UUID roleId;
    private UUID formId;
}
