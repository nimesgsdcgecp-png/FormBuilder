package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.FormRepository;
import com.sttl.formbuilder2.repository.FormVersionRepository;
import com.sttl.formbuilder2.service.FormService;
import com.sttl.formbuilder2.service.SubmissionService;
import com.sttl.formbuilder2.service.DraftService;
import com.sttl.formbuilder2.exception.FormBuilderException;
import com.sttl.formbuilder2.util.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.RUNTIME_BASE)
@RequiredArgsConstructor
public class RuntimeController {

    private final FormRepository formRepository;
    private final FormVersionRepository formVersionRepository;
    private final DraftService draftService;
    private final FormService formService;
    private final SubmissionService submissionService;

    @GetMapping(ApiConstants.RUNTIME_GET_FORM)
    public ResponseEntity<?> getForm(@PathVariable("formCode") String formCode) {
        return ResponseEntity.ok(formService.getFormByCode(formCode));
    }

    @PostMapping(ApiConstants.RUNTIME_SUBMIT)
    public ResponseEntity<?> submitForm(@PathVariable("formCode") String formCode,
                                        @RequestBody com.sttl.formbuilder2.dto.request.SubmissionRequestDTO request) {
        Form form = formRepository.findByCode(formCode)
            .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Form not found"));
            
        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new FormBuilderException("FORM_NOT_PUBLISHED", "Form is not accepting submissions");
        }

        UUID submissionId = submissionService.submitData(form.getId(), request.getData(), request.getFormVersionId(), request.getStatus());
        return ResponseEntity.ok(Map.of("submissionId", submissionId, "message", "Submission successful"));
    }

    @PostMapping(ApiConstants.RUNTIME_SAVE_DRAFT)
    public ResponseEntity<?> saveDraft(@PathVariable("formCode") String formCode,
                                       @RequestBody Map<String, Object> request,
                                       Authentication auth) {
        String username = auth.getName();
        
        Form form = formRepository.findByCode(formCode)
            .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Form not found"));
            
        if (form.getStatus() != FormStatus.PUBLISHED) {
            throw new FormBuilderException("FORM_NOT_PUBLISHED", "Form is not accepting submissions");
        }

        FormVersion active = formVersionRepository.findByFormIdAndIsActiveTrue(form.getId())
            .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "No active version"));

        UUID requestVersionId = null;
        if (request.containsKey("formVersionId") && request.get("formVersionId") != null) {
            requestVersionId = UUID.fromString(request.get("formVersionId").toString());
        }

        if (requestVersionId != null && !active.getId().equals(requestVersionId)) {
            throw new FormBuilderException("VERSION_MISMATCH", "Form version has changed");
        }

        UUID submissionId = draftService.saveDraft(form, active, request, username);
        return ResponseEntity.ok(Map.of("submissionId", submissionId, "status", "RESPONSE_DRAFT"));
    }
}
