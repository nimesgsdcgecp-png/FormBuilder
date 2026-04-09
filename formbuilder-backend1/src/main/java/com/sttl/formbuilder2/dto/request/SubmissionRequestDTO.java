package com.sttl.formbuilder2.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.Map;

/**
 * SubmissionRequestDTO — Request body for form submissions.
 */
@Data
public class SubmissionRequestDTO {
    @jakarta.validation.constraints.NotNull(message = "Submission data is required")
    private Map<String, Object> data;

    @NotBlank(message = "Submission status is required")
    private String status; // DRAFT or FINAL

    private UUID formVersionId;
}
