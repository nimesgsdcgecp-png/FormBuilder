package com.sttl.formbuilder2.dto.request;

import lombok.Data;
import java.util.Map;

/**
 * SubmissionRequestDTO — Request body for form submissions.
 */
@Data
public class SubmissionRequestDTO {
    private Map<String, Object> data;
    private String status; // DRAFT or FINAL
}
