package com.sttl.formbuilder2.dto.request;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Data;

import java.util.List;

/**
 * CreateFormRequestDTO — Request Body for POST /api/forms
 *
 * What it does:
 * Represents the JSON payload sent by the frontend builder when a user clicks
 * "Save Draft" or "Publish" for the first time on a new form.
 *
 * Application flow:
 * Frontend api.ts saveForm() → POST /api/forms → FormController.createForm()
 * → FormService.createForm(request)
 * - Creates a Form entity
 * - Creates a FormVersion with the field list
 * - If status = PUBLISHED: calls DynamicTableService.createDynamicTable()
 *
 * Fields:
 * - {@code allowEditResponse} — whether respondents can edit after submitting.
 * - {@code fields} — ordered list of field definitions for this form.
 * - {@code rules} — list of IF→THEN logic rules (may be empty).
 */
@Data
public class CreateFormRequestDTO {
    private String title;
    private String description;
    private boolean allowEditResponse;
    private FormStatus status;
    private List<FieldDefinitionRequestDTO> fields;
    private List<FormRuleRequestDTO> rules;
}
