package com.sttl.formbuilder2.dto.request;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class WorkflowRequestDTO {
    private UUID formId;
    private String workflowType; // NORMAL, LEVEL_1, LEVEL_2
    private UUID targetBuilderId;
    private List<UUID> intermediateAuthorityIds;
}
