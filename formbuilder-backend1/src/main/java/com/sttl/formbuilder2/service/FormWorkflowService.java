package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.FormRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

/**
 * FormWorkflowService — Handles specialized form transitions involving Workflow logic.
 */
@Service
@RequiredArgsConstructor
public class FormWorkflowService {

    private final FormRepository formRepository;
    private final DynamicTableService dynamicTableService;
    private final AuditService auditService;

    @Transactional
    public void finalizeWorkflowForm(Long formId, AppUser targetOwner, AppUser approver) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new EntityNotFoundException("Form not found"));

        FormStatus oldStatus = form.getStatus();
        // Transition: PENDING_DRAFT -> DRAFT, PENDING_PUBLISH -> PUBLISHED
        FormStatus newStatus = (oldStatus == FormStatus.PENDING_PUBLISH) ? FormStatus.PUBLISHED : FormStatus.DRAFT;

        form.setOwner(targetOwner);
        form.setApprovedBy(approver);
        form.setStatus(newStatus);
        formRepository.save(form);

        String currentActor = SecurityContextHolder.getContext().getAuthentication().getName();
        auditService.log("FORM_FINALIZE", currentActor, "FORM", formId.toString(), "Form finalized as " + newStatus);

        // If it was PENDING_PUBLISH, ensure the table is created
        if (newStatus == FormStatus.PUBLISHED) {
            FormVersion latest = form.getVersions().stream()
                    .max((v1, v2) -> Integer.compare(v1.getVersionNumber(), v2.getVersionNumber()))
                    .orElseThrow(() -> new RuntimeException("No versions found for form"));

            dynamicTableService.createDynamicTable(form.getTargetTableName(), 
                latest.getFields().stream().map(this::toFieldDTO).collect(Collectors.toList()));
        }
    }

    private FieldDefinitionRequestDTO toFieldDTO(FormField f) {
        FieldDefinitionRequestDTO dto = new FieldDefinitionRequestDTO();
        dto.setLabel(f.getFieldLabel());
        dto.setType(f.getFieldType());
        dto.setRequired(f.getIsMandatory());
        dto.setColumnName(f.getColumnName());
        return dto;
    }
}
