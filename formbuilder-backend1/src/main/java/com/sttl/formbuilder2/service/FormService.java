package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.CreateFormRequestDTO;
import com.sttl.formbuilder2.dto.request.UpdateFormRequestDTO;
import com.sttl.formbuilder2.dto.response.FormDetailResponseDTO;
import com.sttl.formbuilder2.dto.response.FormSummaryResponseDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.entity.UserFormRole;
import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.FormRepository;
import com.sttl.formbuilder2.repository.UserRepository;
import com.sttl.formbuilder2.repository.UserFormRoleRepository;
import com.sttl.formbuilder2.repository.WorkflowInstanceRepository;
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
    
    private final FormMapper formMapper;

    // ─────────────────────────────────────────────
    // HELPER: Get Current User
    // ─────────────────────────────────────────────
    private AppUser getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found in database"));
    }

    // ─────────────────────────────────────────────
    // CREATE (POST /api/forms)
    // ─────────────────────────────────────────────
    @Transactional
    public FormDetailResponseDTO createForm(CreateFormRequestDTO request) {
        Form form = new Form();
        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setAllowEditResponse(request.isAllowEditResponse());

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

        form.getVersions().add(version);

        String dynamicTableName = "sub_" + form.getId() + "_u" + form.getOwner().getId() + "_v1";
        form.setTargetTableName(dynamicTableName);

        formRepository.save(form);

        if (incomingStatus == FormStatus.PUBLISHED) {
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
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        if (form.getStatus() != FormStatus.PUBLISHED) {
            // Allow access if user is logged in as owner or administrator (for preview)
            try {
                org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated() && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
                    AppUser currentUser = getCurrentUser();
                    boolean isAdmin = currentUser.getUserFormRoles().stream()
                            .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));
                    
                    if (form.getOwner().getId().equals(currentUser.getId()) || isAdmin) {
                        return formMapper.toDetailDTO(form);
                    }
                }
            } catch (Exception e) {
                // Not logged in or error getting user -> falls through to restriction
            }
            throw new RuntimeException("This form is not currently accepting submissions.");
        }

        return formMapper.toDetailDTO(form);
    }

    // ─────────────────────────────────────────────
    // UPDATE (PUT /api/forms/{id})
    // ─────────────────────────────────────────────
    @Transactional
    public FormDetailResponseDTO updateForm(Long formId, UpdateFormRequestDTO request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormStatus oldStatus = form.getStatus();
        FormStatus newStatus = request.getStatus() != null ? request.getStatus() : oldStatus;

        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setStatus(newStatus);
        form.setAllowEditResponse(request.isAllowEditResponse());

        int nextVersionNum = form.getVersions().size() + 1;
        FormVersion newVersion = new FormVersion();
        newVersion.setForm(form);
        newVersion.setVersionNumber(nextVersionNum);
        newVersion.setChangeLog("Updated via Builder");
        newVersion.setFields(formMapper.mapFields(request.getFields(), newVersion));
        newVersion.setRules(formMapper.serializeRules(request.getRules()));

        form.getVersions().add(newVersion);
        form = formRepository.save(form);

        if ((oldStatus == null || oldStatus == FormStatus.DRAFT) && newStatus == FormStatus.PUBLISHED) {
            form.setApprovedBy(getCurrentUser());
            formRepository.save(form);
            dynamicTableService.createDynamicTable(form.getTargetTableName(), request.getFields());
        } else if (oldStatus == FormStatus.PUBLISHED && newStatus == FormStatus.PUBLISHED) {
            dynamicTableService.alterDynamicTable(form.getTargetTableName(), request.getFields());
        }

        return formMapper.toDetailDTO(form);
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
}