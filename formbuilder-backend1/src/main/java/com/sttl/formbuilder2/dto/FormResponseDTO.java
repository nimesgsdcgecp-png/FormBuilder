package com.sttl.formbuilder2.dto;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class FormResponseDTO {
    private Long id;
    private String title;
    private String description;
    private FormStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private String targetTableName; // Optional: Only if admin needs to know
    private Object rules; // Using Object or String so Jackson can pass the JSON string directly
}