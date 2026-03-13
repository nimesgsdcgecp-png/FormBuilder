package com.sttl.formbuilder2.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class WorkflowRequestDTO {
    private Long formId;
    private String workflowType; // NORMAL, LEVEL_1, LEVEL_2
    private Long targetBuilderId;
    private List<Long> intermediateAuthorityIds;
}
