package com.sttl.formbuilder2.dto.request;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Data;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * UpdateFormRequestDTO — Request Body for PUT /api/forms/{id}
 *
 * What it does:
 * Represents the JSON payload sent by the builder when saving changes to an
 * existing form (re-publish or save draft). Structurally identical to
 * {@link CreateFormRequestDTO} but used on a different endpoint.
 *
 * Application flow:
 * Frontend api.ts saveForm() → PUT /api/forms/{id} →
 * FormController.updateForm()
 * → FormService.updateForm(id, request)
 * - Updates Form metadata (title, description, allowEditResponse, status).
 * - Creates a new FormVersion snapshot with the updated field list.
 * - If status = PUBLISHED: calls DynamicTableService.createDynamicTable()
 * (idempotent — uses IF NOT EXISTS) and alterDynamicTable() to add any
 * new columns to the existing submission table.
 *
 * Note:
 * Schema changes (new fields) only ADD columns — existing data is never lost.
 * Renamed or removed fields become "ghost columns" visible in the responses
 * page.
 */
@Data
public class UpdateFormRequestDTO {
    @NotBlank(message = "Title is required")
    private String title;

    @jakarta.validation.constraints.Pattern(regexp = "^[a-z][a-z0-9_]{0,99}$", message = "Code must be lowercase with underscores only")
    @NotBlank(message = "Code is required")
    private String code;

    private String description;

    private boolean allowEditResponse;

    @NotNull(message = "Status is required")
    private FormStatus status;

    private Object rules;

    @Valid
    private List<FieldValidationRequestDTO> formValidations;

    @NotEmpty(message = "At least one field is required")
    @Valid
    private List<FieldDefinitionRequestDTO> fields;
}
