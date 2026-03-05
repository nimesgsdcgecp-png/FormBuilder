package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.FieldDefinitionDTO;
import com.sttl.formbuilder2.dto.FormDefinitionDTO;
import com.sttl.formbuilder2.dto.FormResponseDTO;
import com.sttl.formbuilder2.dto.FormRuleDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.FormRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;
    private final DynamicTableService dynamicTableService;
    private final ObjectMapper objectMapper;

    @Transactional
    public Form createForm(FormDefinitionDTO request) {
        // 1. Create the Form Entity (Metadata)
        Form form = new Form();
        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());

        // 2. Determine the status (Default to DRAFT if not provided)
        FormStatus incomingStatus = request.getStatus() != null ? request.getStatus() : FormStatus.DRAFT;
        form.setStatus(incomingStatus);

        // Save early to generate the Form ID
        form = formRepository.save(form);

        // 3. Create the First Version
        FormVersion version = new FormVersion();
        version.setForm(form);
        version.setVersionNumber(1);

        // 4. Map Fields
        List<FormField> formFields = new ArrayList<>();
        int ordinal = 0;

        for (FieldDefinitionDTO fieldDTO : request.getFields()) {
            FormField field = new FormField();
            field.setFormVersion(version);
            field.setFieldLabel(fieldDTO.getLabel());
            field.setFieldType(fieldDTO.getType());
            field.setIsMandatory(fieldDTO.isRequired());
            field.setValidationRules(fieldDTO.getValidation());
            field.setDefaultValue(fieldDTO.getDefaultValue());
            field.setOrdinalPosition(ordinal++);

            if (fieldDTO.getOptions() != null) {
                try {
                    field.setOptions(objectMapper.writeValueAsString(fieldDTO.getOptions()));
                } catch (Exception e) {
                    field.setOptions("[]");
                }
            }

            // Generate standard column name (e.g. "first_name")
            String colName = fieldDTO.getLabel().trim().toLowerCase().replaceAll("[^a-z0-9]", "_");
            field.setColumnName(colName);

            formFields.add(field);
        }

        version.setFields(formFields);

        form.getVersions().add(version);

        // Update Form with the target table name
        String dynamicTableName = "sub_" + form.getId() + "_v1";
        form.setTargetTableName(dynamicTableName);

        // Save everything (Cascades will save Version and Fields)
        formRepository.save(form);

        // 5. CRITICAL: Create the Physical Table ONLY if PUBLISHED
        if (incomingStatus == FormStatus.PUBLISHED) {
            dynamicTableService.createDynamicTable(dynamicTableName, request.getFields());
        }

        return form;
    }

    public Form getFormById(Long id) {
        return formRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Form not found with ID: " + id));
    }

    public List<FormResponseDTO> getAllForms() {
        return formRepository.findByStatusNot(FormStatus.ARCHIVED).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // Helper mapper function
    private FormResponseDTO mapToDTO(Form form) {
        return FormResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .targetTableName(form.getTargetTableName())
                .build();
    }

    @Transactional
    public Form updateForm(Long formId, FormDefinitionDTO request) {
        // 1. Load Existing Form
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        FormStatus oldStatus = form.getStatus();
        FormStatus newStatus = request.getStatus() != null ? request.getStatus() : oldStatus;

        // 2. Update Basic Info
        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setStatus(newStatus);

        // 3. Create New Version (Audit History)
        int nextVersionNum = form.getVersions().size() + 1;
        FormVersion newVersion = new FormVersion();
        newVersion.setForm(form);
        newVersion.setVersionNumber(nextVersionNum);
        newVersion.setChangeLog("Updated via Builder");

        // 4. Map Fields
        List<FormField> formFields = new ArrayList<>();
        int ordinal = 0;
        for (FieldDefinitionDTO fieldDTO : request.getFields()) {
            FormField field = new FormField();
            field.setFormVersion(newVersion);
            field.setFieldLabel(fieldDTO.getLabel());
            field.setFieldType(fieldDTO.getType());
            field.setIsMandatory(fieldDTO.isRequired());
            field.setValidationRules(fieldDTO.getValidation());
            field.setDefaultValue(fieldDTO.getDefaultValue());
            field.setOrdinalPosition(ordinal++);

            // Re-added missing options logic for updates!
            if (fieldDTO.getOptions() != null) {
                try {
                    field.setOptions(objectMapper.writeValueAsString(fieldDTO.getOptions()));
                } catch (Exception e) {
                    field.setOptions("[]");
                }
            }

            // Standardize column name
            String colName = fieldDTO.getLabel().trim().toLowerCase().replaceAll("[^a-z0-9]", "_");
            field.setColumnName(colName);

            formFields.add(field);
        }
        newVersion.setFields(formFields);

        // --- ADD THIS RULE MAPPING LOGIC ---
        if (request.getRules() != null && !request.getRules().isEmpty()) {
            try {
                newVersion.setRules(objectMapper.writeValueAsString(request.getRules()));
            } catch (Exception e) {
                newVersion.setRules("[]");
            }
        } else {
            newVersion.setRules("[]");
        }
        // -----------------------------------

        form.getVersions().add(newVersion); // Add to history

        // Save Metadata before messing with tables
        form = formRepository.save(form);

        // 5. CRITICAL: Evolve the SQL Table based on Status Transition
        if ((oldStatus == null || oldStatus == FormStatus.DRAFT) && newStatus == FormStatus.PUBLISHED) {
            // It was a draft, now it's live! Create the table.
            dynamicTableService.createDynamicTable(form.getTargetTableName(), request.getFields());
        }
        else if (oldStatus == FormStatus.PUBLISHED && newStatus == FormStatus.PUBLISHED) {
            // It was already live, and still is. Just alter the columns.
            dynamicTableService.alterDynamicTable(form.getTargetTableName(), request.getFields());
        }
        // If it was DRAFT and is still DRAFT, we do absolutely nothing to the SQL Table.

        return form;
    }

    @Transactional
    public void deleteForm(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Form not found"));

        // Soft Delete: Just change status
        form.setStatus(FormStatus.ARCHIVED);
        formRepository.save(form);
    }

    // Fetch a form by its secure UUID token for public rendering
    public FormResponseDTO getFormByToken(String token) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));

        // Convert your Form entity to whatever DTO you normally return to React
        return mapToDTO(form);
    }


}