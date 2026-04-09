package com.sttl.formbuilder2.dto.response;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * FormDetailResponseDTO — Full Form Response Including Schema and Versions
 *
 * What it does:
 * Returned by:
 * - GET /api/forms/{id} — builder loads existing form for editing
 * - GET /api/forms/public/{token} — public form page loads the form to render
 *
 * Provides all data needed to reconstruct the builder state or render the
 * public form page, including the list of versions (each containing fields
 * and serialised logic rules).
 *
 * Application flow:
 * FormController.getForm() / getPublicForm()
 * → FormService.toDetailDTO(form)
 * → ResponseEntity<FormDetailResponseDTO>
 * → Frontend: builder page restores state / public form page renders fields
 *
 * Key fields:
 * - {@code allowEditResponse} — used by the public page to show/hide the
 * "Edit your response" button after submission.
 * - {@code publicShareToken} — the UUID used in the shareable /f/{token} URL.
 * - {@code versions} — list of {@link FormVersionResponseDTO}s, with the
 * active version always at index 0.
 */
@Data
@Builder
public class FormDetailResponseDTO {
    private UUID id;
    @com.fasterxml.jackson.annotation.JsonProperty("title")
    private String name;
    private String description;
    private FormStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private String targetTableName;
    private String code;
    private Boolean codeLocked;
    private String publicShareToken;
    private boolean allowEditResponse;
    private UUID ownerId;
    private String ownerName;
    private UUID approvedById;
    private String approvedByName;
    private String themeColor;
    private String themeFont;
    private String issuedByUsername;
    private String approvalChain;
    
    @com.fasterxml.jackson.annotation.JsonProperty("fields")
    private List<FormFieldResponseDTO> fields;
    
    @com.fasterxml.jackson.annotation.JsonProperty("rules")
    private Object rules;
    
    private List<FormVersionResponseDTO> versions;
}
