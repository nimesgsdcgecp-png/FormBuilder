package com.sttl.formbuilder2.controller;

import com.sttl.formbuilder2.service.FormVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/forms/{formId}/versions")
@RequiredArgsConstructor
public class FormVersionController {

    private final FormVersionService formVersionService;

    @PostMapping
    public ResponseEntity<?> createVersion(@PathVariable("formId") Long formId) {
        return ResponseEntity.status(201).body(formVersionService.createVersion(formId));
    }

    @GetMapping
    public ResponseEntity<?> listVersions(@PathVariable("formId") Long formId) {
        return ResponseEntity.ok(formVersionService.listVersions(formId));
    }

    @GetMapping("/{versionId}")
    public ResponseEntity<?> getVersion(@PathVariable("formId") Long formId, @PathVariable("versionId") Long versionId) {
        return ResponseEntity.ok(formVersionService.getVersion(formId, versionId));
    }

    @PostMapping("/{versionId}/activate")
    public ResponseEntity<?> activate(@PathVariable("formId") Long formId, @PathVariable("versionId") Long versionId) {
        System.out.println(">>> [DEBUG] REACHED ACTIVATE ENDPOINT - Form: " + formId + ", Version: " + versionId);
        formVersionService.activateVersion(formId, versionId);
        return ResponseEntity.ok(Map.of("message", "Version activated"));
    }
}
