package com.sttl.formbuilder2.exception;

import com.sttl.formbuilder2.dto.response.ErrorResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * GlobalExceptionHandler — Centralised Error Handling
 *
 * Implements the standardized error response contract defined in SRS Section 2.5.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDTO> handleValidationExceptions(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, String>> details = new ArrayList<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            details.add(Map.of("fieldKey", fieldName, "message", errorMessage));
        });

        ErrorResponseDTO errorResponse = new ErrorResponseDTO(
            "VALIDATION_ERROR",
            "Input validation failed",
            details,
            Instant.now().toString(),
            request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(errorResponse);
    }

    @ExceptionHandler(FormBuilderException.class)
    public ResponseEntity<ErrorResponseDTO> handleFormBuilderException(FormBuilderException ex, HttpServletRequest request) {
        HttpStatus status = resolveStatus(ex.getErrorCode());
        
        ErrorResponseDTO errorResponse = new ErrorResponseDTO(
            ex.getErrorCode(),
            ex.getMessage(),
            ex.getDetails(),
            Instant.now().toString(),
            request.getRequestURI()
        );
        
        return ResponseEntity.status(status).body(errorResponse);
    }

    @ExceptionHandler(ExpressionEvaluationException.class)
    public ResponseEntity<ErrorResponseDTO> handleExpressionException(ExpressionEvaluationException ex, HttpServletRequest request) {
        ErrorResponseDTO errorResponse = new ErrorResponseDTO(
            "EXPRESSION_EVALUATION_FAILED",
            ex.getMessage(),
            List.of(Map.of("expressionId", ex.getExpressionId() != null ? ex.getExpressionId() : "", "context", ex.getContext() != null ? ex.getContext() : "")),
            Instant.now().toString(),
            request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(errorResponse);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDTO> handleResponseStatusException(ResponseStatusException ex, HttpServletRequest request) {
        ErrorResponseDTO errorResponse = new ErrorResponseDTO(
            ex.getStatusCode().toString(),
            ex.getReason() != null ? ex.getReason() : ex.getMessage(),
            List.of(),
            Instant.now().toString(),
            request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatusCode()).body(errorResponse);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponseDTO> handleRuntimeExceptions(RuntimeException ex, HttpServletRequest request) {
        ex.printStackTrace();
        ErrorResponseDTO errorResponse = new ErrorResponseDTO(
            "INTERNAL_SERVER_ERROR",
            ex.getMessage(),
            List.of(),
            Instant.now().toString(),
            request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    private HttpStatus resolveStatus(String code) {
        return switch (code) {
            case "FORM_NOT_FOUND", "DRAFT_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "FORM_ARCHIVED" -> HttpStatus.GONE;
            case "UNAUTHORIZED" -> HttpStatus.UNAUTHORIZED;
            case "FORBIDDEN", "FORM_NOT_PUBLISHED" -> HttpStatus.FORBIDDEN;
            case "DUPLICATE_FORM_CODE", "VERSION_MISMATCH", "ALREADY_ACTIVE" -> HttpStatus.CONFLICT;
            case "SCHEMA_DRIFT_DETECTED" -> HttpStatus.INTERNAL_SERVER_ERROR;
            case "SQL_RESERVED_KEYWORD", "TYPE_MISMATCH", "INVALID_FIELD_KEY" -> HttpStatus.BAD_REQUEST;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
