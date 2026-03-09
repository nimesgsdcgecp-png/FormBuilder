package com.sttl.formbuilder2.dto.request;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Data;

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
    private String title;
    private String description;
    private boolean allowEditResponse;
    private FormStatus status;
    private Object rules;
    private List<FieldDefinitionRequestDTO> fields;
}
