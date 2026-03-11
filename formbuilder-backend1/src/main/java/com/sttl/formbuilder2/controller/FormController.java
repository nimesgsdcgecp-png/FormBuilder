package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.request.CreateFormRequestDTO;
import com.sttl.formbuilder2.dto.request.SubmissionRequestDTO;
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
import java.util.stream.Collectors;

/**
 * REST Controller for Forms and Submissions.
 * Exposes the primary API under /api/forms.
 * Delegates business logic to FormService, SubmissionService, and DynamicTableService.
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

    @GetMapping("/{id}/submissions")
    public ResponseEntity<Map<String, Object>> getSubmissions(
            @PathVariable("id") Long id,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size,
            @RequestParam(name = "sortBy", defaultValue = "submitted_at") String sortBy,
            @RequestParam(name = "sortOrder", defaultValue = "DESC") String sortOrder,
            @RequestParam Map<String, String> allParams) {

        // Filter out known pagination params to leave only custom column filters
        Map<String, String> filters = allParams.entrySet().stream()
                .filter(e -> !List.of("page", "size", "sortBy", "sortOrder").contains(e.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        return ResponseEntity.ok(submissionService.getSubmissions(id, page, size, sortBy, sortOrder, filters));
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
            @RequestBody SubmissionRequestDTO request) {

        UUID submissionId = submissionService.submitData(id, request.getData(), request.getStatus());
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
    public ResponseEntity<Map<String, Object>> updateSubmission(
            @PathVariable("formId") Long formId,
            @PathVariable("submissionId") UUID submissionId,
            @RequestBody SubmissionRequestDTO request) {
        UUID id = submissionService.updateSubmission(formId, submissionId, request.getData(), request.getStatus());
        return ResponseEntity.ok(Map.of("submissionId", id, "message", "Update successful"));
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

    /**
     * DELETE /api/forms/{formId}/submissions/bulk
     * Hard-deletes multiple submission rows in one call.
     */
    @DeleteMapping("/{formId}/submissions/bulk")
    public ResponseEntity<Void> deleteSubmissionsBulk(
            @PathVariable("formId") Long formId,
            @RequestBody List<UUID> submissionIds) {
        submissionService.deleteSubmissionsBulk(formId, submissionIds);
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
            @RequestBody SubmissionRequestDTO request) {
        UUID submissionId = submissionService.submitDataByToken(token, request.getData(), request.getStatus());
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
    public ResponseEntity<Map<String, Object>> updatePublicSubmission(
            @PathVariable("token") String token,
            @PathVariable("submissionId") UUID submissionId,
            @RequestBody SubmissionRequestDTO request) {
        UUID id = submissionService.updateSubmissionByToken(token, submissionId, request.getData(),
                request.getStatus());
        return ResponseEntity.ok(Map.of("submissionId", id, "message", "Update successful"));
    }
}