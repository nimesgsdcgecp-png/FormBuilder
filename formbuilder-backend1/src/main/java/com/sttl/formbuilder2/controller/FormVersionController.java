package com.sttl.formbuilder2.controller;

import java.util.UUID;

import com.sttl.formbuilder2.service.FormVersionService;
import com.sttl.formbuilder2.util.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping(ApiConstants.VERSIONS_BASE)
@RequiredArgsConstructor
public class FormVersionController {

    private final FormVersionService formVersionService;

    @PostMapping(ApiConstants.VERSIONS_CREATE)
    public ResponseEntity<?> createVersion(@PathVariable("formId") UUID formId) {
        return ResponseEntity.status(201).body(formVersionService.createVersion(formId));
    }

    @GetMapping(ApiConstants.VERSIONS_LIST)
    public ResponseEntity<?> listVersions(@PathVariable("formId") UUID formId) {
        return ResponseEntity.ok(formVersionService.listVersions(formId));
    }

    @GetMapping(ApiConstants.VERSIONS_GET)
    public ResponseEntity<?> getVersion(@PathVariable("formId") UUID formId, @PathVariable("versionId") UUID versionId) {
        return ResponseEntity.ok(formVersionService.getVersion(formId, versionId));
    }

    @PostMapping(ApiConstants.VERSIONS_ACTIVATE)
    public ResponseEntity<?> activate(@PathVariable("formId") UUID formId, @PathVariable("versionId") UUID versionId) {
        System.out.println(">>> [DEBUG] REACHED ACTIVATE ENDPOINT - Form: " + formId + ", Version: " + versionId);
        formVersionService.activateVersion(formId, versionId);
        return ResponseEntity.ok(Map.of("message", "Version activated"));
    }
}
