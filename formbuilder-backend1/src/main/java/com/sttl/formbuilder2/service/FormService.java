package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.CreateFormRequestDTO;
import com.sttl.formbuilder2.dto.request.FieldValidationRequestDTO;
import com.sttl.formbuilder2.dto.request.UpdateFormRequestDTO;
import com.sttl.formbuilder2.dto.response.FormDetailResponseDTO;
import com.sttl.formbuilder2.dto.response.FormSummaryResponseDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.exception.FormBuilderException;
import com.sttl.formbuilder2.model.entity.FieldValidation;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.entity.UserFormRole;
import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.repository.*;
import com.sttl.formbuilder2.config.FormBuilderLimitsConfig;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * FormService — Core Business Logic for Form Management (Refactored)
 */
@Service
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;
    private final DynamicTableService dynamicTableService;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final UserFormRoleRepository userFormRoleRepository;
    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final FieldValidationRepository fieldValidationRepository;
    private final FormMapper formMapper;
    private final FormBuilderLimitsConfig limitsConfig;
    private final FormSubmissionMetaRepository formSubmissionMetaRepository;
    private final ObjectMapper objectMapper;

    // ─────────────────────────────────────────────
    // HELPER: Get Current User
    // ─────────────────────────────────────────────
    private AppUser getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found in database"));
    }

    // ─────────────────────────────────────────────
    // HELPER: Validate Code
    // ─────────────────────────────────────────────
    private static final java.util.Set<String> RESERVED_SQL_KEYWORDS = java.util.Set.of(
        "SELECT","INSERT","UPDATE","DELETE","FROM","WHERE","JOIN","INNER","LEFT","RIGHT",
        "FULL","GROUP","ORDER","BY","HAVING","LIMIT","OFFSET","UNION","DISTINCT",
        "TABLE","COLUMN","INDEX","PRIMARY","FOREIGN","KEY","CONSTRAINT","REFERENCES",
        "VIEW","SEQUENCE","TRIGGER","USER","ROLE","GRANT","REVOKE"
    );

    private void validateFormCode(String code) {
        if (code == null || code.isBlank()) {
            throw new FormBuilderException("INVALID_FORM_CODE", "Code is required");
        }
        if (!code.matches("^[a-z][a-z0-9_]{0,99}$")) {
            throw new FormBuilderException("INVALID_FORM_CODE", "Code must start with a letter, use only lowercase alphanumeric characters and underscores, and be max 100 characters.");
        }
        if (RESERVED_SQL_KEYWORDS.contains(code.toUpperCase())) {
            throw new FormBuilderException("INVALID_FORM_CODE", "Code is a reserved keyword: " + code);
        }
        if (formRepository.existsByCode(code)) {
            throw new FormBuilderException("DUPLICATE_FORM_CODE", "Form code already exists: " + code);
        }
    }

    // ─────────────────────────────────────────────
    // HELPER: Validate SRS Limits (Section 10)
    // ─────────────────────────────────────────────
    private void validateFormLimits(Object request, List<com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO> fields,
                                    List<FieldValidationRequestDTO> validations) {
        // Max Payload Size (100 KB)
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(request);
            if (bytes.length > limitsConfig.getMaxPayloadSizeKb() * 1024) {
                throw new FormBuilderException("LIMIT_EXCEEDED",
                    "Payload size exceeds limit of " + limitsConfig.getMaxPayloadSizeKb() + " KB. Current: " + (bytes.length / 1024) + " KB");
            }
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            // Ignore - if it can't be serialized here, it's problematic anyway
        }

        // Max 50 fields per form
        if (fields != null && fields.size() > limitsConfig.getMaxFieldsPerForm()) {
            throw new FormBuilderException("LIMIT_EXCEEDED",
                "Maximum " + limitsConfig.getMaxFieldsPerForm() + " fields allowed per form. Current: " + fields.size());
        }

        // Max 100 validations per form
        if (validations != null && validations.size() > limitsConfig.getMaxValidationsPerForm()) {
            throw new FormBuilderException("LIMIT_EXCEEDED",
                "Maximum " + limitsConfig.getMaxValidationsPerForm() + " validations allowed per form. Current: " + validations.size());
        }

        // Max 10 pages/sections per form
        if (fields != null) {
            long pageCount = fields.stream()
                .filter(f -> f.getType() == com.sttl.formbuilder2.model.enums.FieldType.PAGE_BREAK ||
                            f.getType() == com.sttl.formbuilder2.model.enums.FieldType.SECTION_HEADER)
                .count();
            if (pageCount > limitsConfig.getMaxPagesPerForm()) {
                throw new FormBuilderException("LIMIT_EXCEEDED",
                    "Maximum " + limitsConfig.getMaxPagesPerForm() + " pages/sections allowed per form. Current: " + pageCount);
            }
        }
    }

    // ─────────────────────────────────────────────
    // CREATE (POST /api/forms)
    // ─────────────────────────────────────────────
    @Transactional
    public FormDetailResponseDTO createForm(CreateFormRequestDTO request) {
        // SRS Section 10: Validate limits before proceeding
        validateFormLimits(request, request.getFields(), request.getFormValidations());

        Form form = new Form();
        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setAllowEditResponse(request.isAllowEditResponse());

        validateFormCode(request.getCode());
        form.setCode(request.getCode());
        form.setCodeLocked(false);

        FormStatus incomingStatus = request.getStatus() != null ? request.getStatus() : FormStatus.DRAFT;
        form.setStatus(incomingStatus);

        AppUser currentUser = getCurrentUser();
        form.setOwner(currentUser);
        form.setCreator(currentUser);
        form.setIssuedByUsername(currentUser.getUsername());

        form = formRepository.save(form);

        FormVersion version = new FormVersion();
        version.setForm(form);
        version.setVersionNumber(1);
        version.setFields(formMapper.mapFields(request.getFields(), version));
        version.setRules(formMapper.serializeRules(request.getRules()));

        if (incomingStatus == FormStatus.PUBLISHED) {
            version.setIsActive(true);
            version.setActivatedAt(java.time.Instant.now());
            version.setActivatedBy(currentUser.getUsername());
        } else {
            version.setIsActive(false);
        }

        form.getVersions().add(version);

        String dynamicTableName = "form_data_" + form.getCode();
        form.setTargetTableName(dynamicTableName);

        form = formRepository.saveAndFlush(form);
        
        // Find the persisted version in the returned managed form
        FormVersion persistedVersion = form.getVersions().stream()
                .filter(v -> v.getVersionNumber() == 1)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Saved version not found"));

        // Save custom AST validations
        saveValidations(request.getFormValidations(), persistedVersion.getId());

        if (incomingStatus == FormStatus.PUBLISHED) {
            form.setCodeLocked(true);
            form.setApprovedBy(currentUser);
            formRepository.save(form);
            dynamicTableService.createDynamicTable(dynamicTableName, request.getFields());
        }

        auditService.log("FORM_SAVE", currentUser.getUsername(), "FORM", form.getId().toString(), "Form saved as " + incomingStatus);

        return formMapper.toDetailDTO(form);
    }

    // ─────────────────────────────────────────────
    // READ ALL (GET /api/forms)
    // ─────────────────────────────────────────────
    public List<FormSummaryResponseDTO> getAllForms() {
        AppUser currentUser = getCurrentUser();
        boolean hasAllAccess = currentUser.getUserFormRoles().stream()
                .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));

        List<Form> forms;
        if (hasAllAccess) {
            forms = formRepository.findAllByStatusNotOrderByUpdatedAtDesc(FormStatus.ARCHIVED);
        } else {
            forms = formRepository.findByAccessAndStatusNot(currentUser, currentUser.getUsername(), FormStatus.ARCHIVED);
        }

        return forms.stream()
                .map(formMapper::toSummaryDTO)
                .collect(Collectors.toList());
    }

    public List<FormSummaryResponseDTO> getArchivedForms() {
        AppUser currentUser = getCurrentUser();
        boolean hasAllAccess = currentUser.getUserFormRoles().stream()
                .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));

        List<Form> forms;
        if (hasAllAccess) {
            forms = formRepository.findByStatusOrderByUpdatedAtDesc(FormStatus.ARCHIVED);
        } else {
            forms = formRepository.findByAccessAndStatus(currentUser, currentUser.getUsername(), FormStatus.ARCHIVED);
        }

        return forms.stream()
                .map(formMapper::toSummaryDTO)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────
    // READ ONE (GET /api/forms/{id})
    // ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public FormDetailResponseDTO getFormById(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Form not found with ID: " + id));
        return formMapper.toDetailDTO(form);
    }

    // ─────────────────────────────────────────────
    // READ BY TOKEN (GET /api/forms/public/{token})
    // ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public FormDetailResponseDTO getFormByToken(String token) {
        Form form = formRepository.findByPublicShareToken(token)
                .or(() -> formRepository.findByCode(token))
                .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Form not found or link is invalid."));

        validateFormAccess(form);
        return formMapper.toDetailDTO(form);
    }

    @Transactional(readOnly = true)
    public FormDetailResponseDTO getFormByCode(String code) {
        Form form = formRepository.findByCode(code)
                .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Form not found with code: " + code));

        validateFormAccess(form);
        return formMapper.toDetailDTO(form);
    }

    private void validateFormAccess(Form form) {
        if (form.getStatus() != FormStatus.PUBLISHED) {
            // Allow access if user is logged in as owner or administrator (for preview)
            try {
                org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
                    AppUser currentUser = getCurrentUser();
                    boolean isAdmin = currentUser.getUserFormRoles().stream()
                            .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));
                    
                    if (form.getOwner().getId().equals(currentUser.getId()) || isAdmin) {
                        return;
                    }
                }
            } catch (Exception e) {
                // Not logged in or error getting user -> falls through to restriction
            }
            throw new FormBuilderException("FORM_NOT_PUBLISHED", "This form is not currently accepting submissions.");
        }
    }

    // ─────────────────────────────────────────────
    // UPDATE (PUT /api/forms/{id})
    // ─────────────────────────────────────────────
    @Transactional
    public FormDetailResponseDTO updateForm(Long formId, UpdateFormRequestDTO request) {
        // SRS Section 10: Validate limits before proceeding
        validateFormLimits(request, request.getFields(), request.getFormValidations());

        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormStatus oldStatus = form.getStatus();
        FormStatus newStatus = request.getStatus() != null ? request.getStatus() : oldStatus;

        // SRS Section 11.1: Forms with live submissions cannot be modified
        if (oldStatus == FormStatus.PUBLISHED && newStatus == FormStatus.PUBLISHED) {
            long liveSubmissions = formSubmissionMetaRepository.countByFormIdInAndIsDeletedFalseAndStatusIn(
                java.util.List.of(formId), java.util.List.of("SUBMITTED", "FINAL"));
            if (liveSubmissions > 0) {
                throw new FormBuilderException("FORBIDDEN", 
                    "Form cannot be modified because it has " + liveSubmissions + " live submission(s). To make changes, save your form as a DRAFT.");
            }
        }

        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setStatus(newStatus);
        form.setAllowEditResponse(request.isAllowEditResponse());

        if (request.getCode() != null && !request.getCode().equals(form.getCode())) {
            if (Boolean.TRUE.equals(form.getCodeLocked())) {
                throw new FormBuilderException("FORBIDDEN", "Form code is locked and cannot be changed after publishing.");
            }
            validateFormCode(request.getCode());
            form.setCode(request.getCode());
            form.setTargetTableName("form_data_" + form.getCode());
        }

        if (newStatus == com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            // SRS Requirement: Block publish if current table has drifted from active schema
            dynamicTableService.validateNoSchemaDrift(form);
        }

        int nextVersionNum = form.getVersions().size() + 1;
        com.sttl.formbuilder2.model.entity.FormVersion newVersion = new com.sttl.formbuilder2.model.entity.FormVersion();
        newVersion.setForm(form);
        newVersion.setVersionNumber(nextVersionNum);
        newVersion.setChangeLog("Updated via Builder");
        newVersion.setFields(formMapper.mapFields(request.getFields(), newVersion));
        newVersion.setRules(formMapper.serializeRules(request.getRules()));

        // REFINEMENT: Even if DRAFT, make it the "active" version for the builder to load latest changes
        // This ensures the FormMapper picks the latest version even if it's not yet PUBLISHED.
        form.getVersions().forEach(v -> v.setIsActive(false));
        newVersion.setIsActive(true);
        if (newStatus == com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            newVersion.setActivatedAt(java.time.Instant.now());
            newVersion.setActivatedBy(getCurrentUser().getUsername());
            softDeleteDraftsForForm(formId);
        }

        form.getVersions().add(newVersion);
        form = formRepository.saveAndFlush(form);

        // Find the persisted version
        final int vNum = nextVersionNum;
        com.sttl.formbuilder2.model.entity.FormVersion persistedNewVersion = form.getVersions().stream()
                .filter(v -> v.getVersionNumber().equals(vNum))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Saved version not found"));

        // Replace custom AST validations for this version
        fieldValidationRepository.deleteByFormVersionId(persistedNewVersion.getId());
        saveValidations(request.getFormValidations(), persistedNewVersion.getId());

        if ((oldStatus == null || oldStatus == com.sttl.formbuilder2.model.enums.FormStatus.DRAFT) && newStatus == com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            form.setCodeLocked(true);
            form.setApprovedBy(getCurrentUser());
            formRepository.save(form);
            dynamicTableService.createDynamicTable(form.getTargetTableName(), request.getFields());
        } else if (oldStatus == com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED && newStatus == com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED) {
            dynamicTableService.alterDynamicTable(form.getTargetTableName(), request.getFields());
        }

        return formMapper.toDetailDTO(form);
    }

    private void softDeleteDraftsForForm(Long formId) {
        Form form = formRepository.findById(formId).orElse(null);
        if (form == null) return;
        
        // 1. Soft delete in metadata table
        formSubmissionMetaRepository.softDeleteByFormIdAndStatus(formId, "RESPONSE_DRAFT");
        
        // 2. Soft delete in dynamic table
        dynamicTableService.softDeleteRowsByForm(form.getTargetTableName(), formId);
        
        auditService.log("DRAFTS_DISCARDED", "SYSTEM", "FORM", formId.toString(), "Drafts soft-deleted due to version update");
    }

    // ─────────────────────────────────────────────
    // HELPER: Save/replace validation rules
    // ─────────────────────────────────────────────
    private void saveValidations(java.util.List<FieldValidationRequestDTO> dtos, Long formVersionId) {
        if (dtos == null || dtos.isEmpty()) return;
        int order = 0;
        for (FieldValidationRequestDTO dto : dtos) {
            FieldValidation fv = new FieldValidation();
            fv.setFormVersionId(formVersionId);
            fv.setFieldKey(dto.getFieldKey() != null ? dto.getFieldKey() : "");
            fv.setScope(dto.getScope());
            fv.setExpression(dto.getExpression());
            fv.setErrorMessage(dto.getErrorMessage());
            fv.setExecutionOrder(dto.getExecutionOrder() != null ? dto.getExecutionOrder() : order);
            fieldValidationRepository.save(fv);
            order++;
        }
    }

    // ─────────────────────────────────────────────
    // DELETE / ARCHIVE (DELETE /api/forms/{id})
    // ─────────────────────────────────────────────
    @Transactional
    public void deleteForm(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        form.setStatus(FormStatus.ARCHIVED);
        formRepository.save(form);
        
        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        auditService.log("FORM_ARCHIVE", actor, "FORM", id.toString(), "Form archived");
    }

    @Transactional
    public void hardDeleteForm(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Form not found with ID: " + id));
        
        String tableName = form.getTargetTableName();
        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        
        auditService.log("FORM_HARD_DELETE", actor, "FORM", id.toString(), "Form permanently deleted: " + form.getTitle());
        
        List<WorkflowInstance> instances = workflowInstanceRepository.findAllByFormId(id);
        workflowInstanceRepository.deleteAll(instances);
        
        List<UserFormRole> roles = userFormRoleRepository.findAllByFormId(id);
        userFormRoleRepository.deleteAll(roles);
        
        if (tableName != null) {
            dynamicTableService.dropTable(tableName);
        }
        
        formRepository.delete(form);
    }

    @Transactional
    public void restoreForm(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Form not found"));
        if (form.getStatus() != FormStatus.ARCHIVED) {
            throw new RuntimeException("Only archived forms can be restored.");
        }
        form.setStatus(FormStatus.DRAFT);
        formRepository.save(form);
    }

    // ─────────────────────────────────────────────
    // DASHBOARD STATS (GET /api/v1/forms/stats)
    // ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public com.sttl.formbuilder2.dto.response.DashboardStatsResponseDTO getDashboardStats() {
        AppUser currentUser = getCurrentUser();
        String username = currentUser.getUsername();
        boolean isAdmin = currentUser.getUserFormRoles().stream()
                .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));

        long totalForms;
        long publishedForms;
        long draftForms;
        List<Form> activeForms;

        if (isAdmin) {
            totalForms = formRepository.countByStatusNot(FormStatus.ARCHIVED);
            publishedForms = formRepository.countByStatus(FormStatus.PUBLISHED);
            draftForms = formRepository.countByStatus(FormStatus.DRAFT);
            activeForms = formRepository.findAllByStatusNotOrderByUpdatedAtDesc(FormStatus.ARCHIVED);
        } else {
            totalForms = formRepository.countByAccessAndStatusNot(currentUser, username, FormStatus.ARCHIVED);
            publishedForms = formRepository.countByAccessAndStatus(currentUser, username, FormStatus.PUBLISHED);
            draftForms = formRepository.countByAccessAndStatus(currentUser, username, FormStatus.DRAFT);
            activeForms = formRepository.findByAccessAndStatusNot(currentUser, username, FormStatus.ARCHIVED);
        }

        List<Long> formIds = activeForms.stream().map(Form::getId).collect(java.util.stream.Collectors.toList());
        long totalSubmissions = formIds.isEmpty() ? 0 : formSubmissionMetaRepository.countByFormIdInAndIsDeletedFalseAndStatusIn(formIds, List.of("SUBMITTED", "FINAL"));

        List<com.sttl.formbuilder2.dto.response.FormSummaryResponseDTO> recentForms = activeForms.stream()
                .limit(5)
                .map(formMapper::toSummaryDTO)
                .collect(java.util.stream.Collectors.toList());

        return com.sttl.formbuilder2.dto.response.DashboardStatsResponseDTO.builder()
                .totalForms(totalForms)
                .publishedForms(publishedForms)
                .draftForms(draftForms)
                .totalSubmissions(totalSubmissions)
                .recentForms(recentForms)
                .build();
    }
}