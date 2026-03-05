package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.dto.FormDefinitionDTO;
import com.sttl.formbuilder2.dto.FormResponseDTO;
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

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;
    private final SubmissionService submissionService;
    private final DynamicTableService dynamicTableService;

    // GET http://localhost:8080/api/forms
    @GetMapping
    public ResponseEntity<List<FormResponseDTO>> getAllForms() {
        return ResponseEntity.ok(formService.getAllForms());
    }

    // POST http://localhost:8080/api/forms
    @PostMapping
    public ResponseEntity<Form> createForm(@RequestBody FormDefinitionDTO request) {
        Form createdForm = formService.createForm(request);
        return ResponseEntity.ok(createdForm);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Form> getForm(@PathVariable Long id) {
        return ResponseEntity.ok(formService.getFormById(id));
    }

    // GET http://localhost:8080/api/forms/2/submissions
    @GetMapping("/{id}/submissions")
    public ResponseEntity<List<Map<String, Object>>> getSubmissions(@PathVariable Long id) {
        return ResponseEntity.ok(submissionService.getSubmissions(id));
    }

    // POST http://localhost:8080/api/forms/2/submissions
    @PostMapping("/{id}/submissions")
    public ResponseEntity<Map<String, Object>> submitForm(
            @PathVariable Long id,
            @RequestBody Map<String, Object> submissionData) {

        java.util.UUID submissionId = submissionService.submitData(id, submissionData);

        return ResponseEntity.ok(Map.of(
                "message", "Submission successful",
                "submissionId", submissionId
        ));
    }

    // PUT http://localhost:8080/api/forms/2
    @PutMapping("/{id}")
    public ResponseEntity<Form> updateForm(@PathVariable Long id, @RequestBody FormDefinitionDTO request) {
        return ResponseEntity.ok(formService.updateForm(id, request));
    }

    // DELETE http://localhost:8080/api/forms/2
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteForm(@PathVariable Long id) {
        formService.deleteForm(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/columns/{columnName}/values")
    public ResponseEntity<List<String>> getLookupValues(
            @PathVariable Long id,
            @PathVariable String columnName) {
        return ResponseEntity.ok(dynamicTableService.getColumnValues(id, columnName));
    }

    @DeleteMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<Void> deleteSubmission(
            @PathVariable Long formId,
            @PathVariable UUID submissionId) {
        submissionService.deleteSubmission(formId, submissionId);
        return ResponseEntity.ok().build();
    }


    @GetMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<Map<String, Object>> getSubmission(@PathVariable Long formId, @PathVariable UUID submissionId) {
        return ResponseEntity.ok(submissionService.getSubmissionById(formId, submissionId));
    }

    @PutMapping("/{formId}/submissions/{submissionId}")
    public ResponseEntity<Void> updateSubmission(
            @PathVariable Long formId,
            @PathVariable UUID submissionId,
            @RequestBody Map<String, Object> data) {
        submissionService.updateSubmission(formId, submissionId, data);
        return ResponseEntity.ok().build();
    }


    // --- 1. GET PUBLIC FORM BY TOKEN ---
    @GetMapping("/public/{token}")
    public ResponseEntity<?> getPublicForm(@PathVariable String token) {
        // Hands off to FormService
        return ResponseEntity.ok(formService.getFormByToken(token));
    }

    // --- 2. SUBMIT PUBLIC FORM BY TOKEN ---
    @PostMapping("/public/{token}/submissions")
    public ResponseEntity<?> submitPublicForm(@PathVariable String token, @RequestBody Map<String, Object> answers) {
        // Hands off to SubmissionService
        UUID submissionId = submissionService.submitDataByToken(token, answers);

        return ResponseEntity.ok(Map.of(
                "message", "Submission successful",
                "submissionId", submissionId
        ));
    }
}