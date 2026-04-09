package com.sttl.formbuilder2.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import java.util.Map;

/**
 * ErrorResponseDTO — Standardized Error Response Structure.
 * 
 * Mandated by SRS Section 2.5 and Implementation Blueprint Section 3.3.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponseDTO {
    private String errorCode;
    private String message;
    private List<Map<String, String>> details;
    private String timestamp;
    private String path;
}
