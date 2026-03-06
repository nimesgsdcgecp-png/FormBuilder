package com.sttl.formbuilder2.dto.response;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

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
    private Long id;
    private String title;
    private String description;
    private FormStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private String targetTableName;
    private String publicShareToken;
    private boolean allowEditResponse;
    private List<FormVersionResponseDTO> versions;
}
