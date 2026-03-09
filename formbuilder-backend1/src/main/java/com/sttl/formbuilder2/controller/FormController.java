package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.request.CreateFormRequestDTO;
import com.sttl.formbuilder2.dto.request.UpdateFormRequestDTO;
import com.sttl.formbuilder2.dto.response.FormDetailResponseDTO;
import com.sttl.formbuilder2.dto.response.FormSummaryResponseDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.service.DynamicTableService;
import com.sttl.formbuilder2.service.FormService;
import com.sttl.formbuilder2.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * FormController — REST Controller for Forms and Submissions
 *
 * What it does:
 * Exposes the primary REST API of the FormBuilder backend under the base path
 * {@code /api/forms}. It acts as a thin routing layer — all business logic is
 * delegated to {@code FormService}, {@code SubmissionService}, and
 * {@code DynamicTableService}.
 *
 * CORS is configured globally in {@code WebConfig} (allows origin:
 * localhost:3000).
 *
 * Grouped endpoints:
 *
 * Form CRUD (authenticated / builder use):
 * GET /api/forms — List (dashboard, lightweight)
 * POST /api/forms — Create a new form
 * GET /api/forms/{id} — Full form detail with schema + versions
 * PUT /api/forms/{id} — Update form title, fields, rules, etc.
 * DELETE /api/forms/{id} — Soft-delete (archive)
 *
 * Submissions (authenticated responses table):
 * GET /api/forms/{id}/submissions — All rows for a form
 * POST /api/forms/{id}/submissions — New submission (by form ID)
 * GET /api/forms/{id}/submissions/{subId} — Single row lookup
 * PUT /api/forms/{id}/submissions/{subId} — Edit an existing submission
 * DELETE /api/forms/{id}/submissions/{subId} — Delete a submission row
 *
 * Lookup (for the LOOKUP field type):
 * GET /api/forms/{id}/columns/{col}/values — Distinct column values
 *
 * Public (token-based, no auth):
 * GET /api/forms/public/{token} — Resolve token → form schema
 * POST /api/forms/public/{token}/submissions — Submit via public share link
 */
@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;
    private final SubmissionService submissionService;
    private final DynamicTableService dynamicTableService;

    // ─────────────────────────────────────────────────────────
    // Form CRUD
    // ─────────────────────────────────────────────────────────

    /**
     * GET /api/forms
     * Returns a lightweight list of all non-archived forms for the dashboard.
     * Uses {@code FormSummaryResponseDTO} to avoid over-fetching field/version
     * data.
     */
    @GetMapping
    public ResponseEntity<List<FormSummaryResponseDTO>> getAllForms() {
        return ResponseEntity.ok(formService.getAllForms());
    }

    /**
     * POST /api/forms
     * Creates a brand-new form (DRAFT status). Does NOT create a submission table
     * yet — that only happens on Publish (PUT with status=PUBLISHED).
     */
    @PostMapping
    public ResponseEntity<Form> createForm(@RequestBody CreateFormRequestDTO request) {
        return ResponseEntity.ok(formService.createForm(request));
    }

    /**
     * GET /api/forms/{id}
     * Returns the full form detail including the current version's fields and
     * logic rules. Used by the builder when loading an existing form to edit,
     * and by the responses page to build the table column headers.
     */
    @GetMapping("/{id}")
    public ResponseEntity<FormDetailResponseDTO> getForm(@PathVariable("id") Long id) {
        return ResponseEntity.ok(formService.getFormById(id));
    }

    /**
     * PUT /api/forms/{id}
     * Updates an existing form. If the status is changing to PUBLISHED, this also
     * creates or alters the dynamic submission table via
     * {@code DynamicTableService}.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Form> updateForm(@PathVariable("id") Long id, @RequestBody UpdateFormRequestDTO request) {
        return ResponseEntity.ok(formService.updateForm(id, request));
    }

    /**
     * DELETE /api/forms/{id}
     * Soft-deletes a form by setting its status to ARCHIVED. The form data and
     * all submissions remain in the database.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteForm(@PathVariable("id") Long id) {
        formService.deleteForm(id);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────
    // Submission endpoints
    // ─────────────────────────────────────────────────────────

    /**
     * GET /api/forms/{id}/submissions
     * Returns all rows from the form's dynamic submission table, ordered
     * newest-first.
     * Used by the responses admin page to populate the data table.
     */
    @GetMapping("/{id}/submissions")
    public ResponseEntity<List<Map<String, Object>>> getSubmissions(@PathVariable("id") Long id) {
        return ResponseEntity.ok(submissionService.getSubmissions(id));
    }

    /**
     * POST /api/forms/{id}/submissions
     * Accepts a JSON map of {columnName: value} pairs and inserts a new row into
     * the dynamic submissions table. Runs rule validation before inserting. Returns
     * the generated {@code submissionId} (UUID) so the frontend can offer an edit
     * link.
     */
    @PostMapping("/{id}/submissions")
    public ResponseEntity<Map<String, Object>> submitForm(
            @PathVariable("id") Long id,
            @RequestBody Map<String, Object> submissionData) {

        UUID submissionId = submissionService.submitData(id, submissionData);
        return ResponseEntity.ok(Map.of(
                "message", "Submission successful",
                "submissionId", submissionId));
    }

    /**
     * GET /api/forms/{formId}/submissions/{submissionId}
     * Retrieves a single submission row by its UUID. Used by the public form page
     * to pre-fill the form when a respondent clicks "Edit your response".
     */
    @GetMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<Map<String, Object>> getSubmission(
            @PathVariable("formId") Long formId,
            @PathVariable("submissionId") UUID submissionId) {
        return ResponseEntity.ok(submissionService.getSubmissionById(formId, submissionId));
    }

    /**
     * PUT /api/forms/{formId}/submissions/{submissionId}
     * Updates an existing submission row with new answer values. Only columns
     * present in the current form version are included in the UPDATE statement.
     */
    @PutMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<Void> updateSubmission(
            @PathVariable("formId") Long formId,
            @PathVariable("submissionId") UUID submissionId,
            @RequestBody Map<String, Object> data) {
        submissionService.updateSubmission(formId, submissionId, data);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/forms/{formId}/submissions/{submissionId}
     * Hard-deletes a submission row from the dynamic table. Used by the admin
     * responses page. This action is irreversible.
     */
    @DeleteMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<Void> deleteSubmission(
            @PathVariable("formId") Long formId,
            @PathVariable("submissionId") UUID submissionId) {
        submissionService.deleteSubmission(formId, submissionId);
        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────
    // Lookup values (for LOOKUP field type)
    // ─────────────────────────────────────────────────────────

    /**
     * GET /api/forms/{id}/columns/{columnName}/values
     * Returns distinct non-null values for a given column in the form's submission
     * table. Drives the dropdown choices for LOOKUP fields at form-fill time.
     * The column name is validated against the form schema to prevent SQL
     * injection.
     */
    @GetMapping("/{id}/columns/{columnName}/values")
    public ResponseEntity<List<String>> getLookupValues(
            @PathVariable("id") Long id,
            @PathVariable("columnName") String columnName) {
        return ResponseEntity.ok(dynamicTableService.getColumnValues(id, columnName));
    }

    // ─────────────────────────────────────────────────────────
    // Public (token-based) form access — no authentication required
    // ─────────────────────────────────────────────────────────

    /**
     * GET /api/forms/public/{token}
     * Resolves a UUID share token to the full form schema. Called by the public
     * form page ({@code /f/[token]}) before rendering the form to respondents.
     * Uses a token instead of an ID to prevent enumeration attacks.
     */
    @GetMapping("/public/{token}")
    public ResponseEntity<FormDetailResponseDTO> getPublicForm(@PathVariable("token") String token) {
        return ResponseEntity.ok(formService.getFormByToken(token));
    }

    /**
     * POST /api/forms/public/{token}/submissions
     * Accepts a submission from a public respondent (identified by share token, no
     * auth required). Resolves the token to a form ID then delegates to the
     * standard
     * submitData flow, including rule validation and workflow execution.
     */
    @PostMapping("/public/{token}/submissions")
    public ResponseEntity<?> submitPublicForm(
            @PathVariable("token") String token,
            @RequestBody Map<String, Object> answers) {
        UUID submissionId = submissionService.submitDataByToken(token, answers);
        return ResponseEntity.ok(Map.of(
                "message", "Submission successful",
                "submissionId", submissionId));
    }

    /**
     * GET /api/forms/public/{token}/submissions/{submissionId}
     * Publicly retrieve a single submission for editing.
     */
    @GetMapping("/public/{token}/submissions/{submissionId}")
    public ResponseEntity<Map<String, Object>> getPublicSubmission(
            @PathVariable("token") String token,
            @PathVariable("submissionId") UUID submissionId) {
        return ResponseEntity.ok(submissionService.getSubmissionByToken(token, submissionId));
    }

    /**
     * PUT /api/forms/public/{token}/submissions/{submissionId}
     * Publicly update an existing submission.
     */
    @PutMapping("/public/{token}/submissions/{submissionId}")
    public ResponseEntity<Void> updatePublicSubmission(
            @PathVariable("token") String token,
            @PathVariable("submissionId") UUID submissionId,
            @RequestBody Map<String, Object> data) {
        submissionService.updateSubmissionByToken(token, submissionId, data);
        return ResponseEntity.ok().build();
    }
}