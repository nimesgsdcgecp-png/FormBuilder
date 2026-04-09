package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.response.FormFieldResponseDTO;
import com.sttl.formbuilder2.dto.response.FormVersionResponseDTO;
import com.sttl.formbuilder2.exception.FormBuilderException;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.FormRepository;
import com.sttl.formbuilder2.repository.FormVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FormVersionService {

    private final FormVersionRepository formVersionRepository;
    private final FormRepository formRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final DraftService draftService;
    private final DynamicTableService dynamicTableService;

    public FormVersionResponseDTO createVersion(UUID formId) {
        Form form = formRepository.findById(formId)
            .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Form not found"));
        if (form.getStatus() == FormStatus.ARCHIVED) {
            throw new FormBuilderException("FORM_ARCHIVED", "Cannot version an archived form");
        }

        FormVersion latest = formVersionRepository
            .findByFormIdOrderByVersionNumberDesc(formId)
            .stream().findFirst().orElse(null);

        FormVersion newVersion = new FormVersion();
        newVersion.setForm(form);
        int nextNum = (latest != null ? latest.getVersionNumber() : 0) + 1;
        newVersion.setVersionNumber(nextNum);
        newVersion.setIsActive(false);
        String actor = SecurityContextHolder.getContext().getAuthentication() != null
            ? SecurityContextHolder.getContext().getAuthentication().getName()
            : "system";
        newVersion.setCreatedBy(actor);
        newVersion.setDefinitionJson("{}");
        if (latest != null) {
            latest.getFields().forEach(f -> {
                FormField clone = cloneField(f, newVersion);
                newVersion.getFields().add(clone);
            });
            newVersion.setRules(latest.getRules());
        }
        formVersionRepository.save(newVersion);
        return toDTO(newVersion);
    }

    @Transactional
    public void activateVersion(UUID formId, UUID versionId) {
        FormVersion toActivate = formVersionRepository.findById(versionId)
            .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Version not found"));
        if (!toActivate.getForm().getId().equals(formId)) {
            throw new FormBuilderException("FORBIDDEN","Version does not belong to this form");
        }
        if (Boolean.TRUE.equals(toActivate.getIsActive())) {
            throw new FormBuilderException("ALREADY_ACTIVE", "Version is already active");
        }

        formVersionRepository.findByFormIdAndIsActiveTrue(formId)
            .ifPresent(prev -> {
                prev.setIsActive(false);
                formVersionRepository.saveAndFlush(prev);
                dropDraftsForVersion(formId, prev.getId());
            });

        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        toActivate.setIsActive(true);
        toActivate.setActivatedBy(actor);
        toActivate.setActivatedAt(Instant.now());
        formVersionRepository.save(toActivate);

        // SYNC TABLE SCHEMA: Ensure the physical table matches the restored version
        String tableName = toActivate.getForm().getTargetTableName();
        if (tableName != null && dynamicTableService.tableExists(tableName)) {
            List<com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO> fieldDtos = toActivate.getFields().stream()
                .map(f -> {
                    com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO dto = new com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO();
                    dto.setLabel(f.getFieldLabel());
                    dto.setFieldKey(f.getFieldKey());
                    dto.setType(f.getFieldType());
                    dto.setRequired(Boolean.TRUE.equals(f.getIsRequired()));
                    dto.setValidation(f.getValidationRules());
                    return dto;
                }).collect(Collectors.toList());
            dynamicTableService.alterDynamicTable(tableName, fieldDtos);
        }

        auditService.log("VERSION_ACTIVATE", actor, "FORM_VERSION", versionId.toString(), "Activated");
    }

    public List<FormVersionResponseDTO> listVersions(UUID formId) {
        return formVersionRepository.findByFormIdOrderByVersionNumberDesc(formId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public FormVersionResponseDTO getVersion(UUID formId, UUID versionId) {
        FormVersion version = formVersionRepository.findById(versionId)
            .orElseThrow(() -> new FormBuilderException("FORM_NOT_FOUND", "Version not found"));
        if (!version.getForm().getId().equals(formId)) {
            throw new FormBuilderException("FORBIDDEN", "Version does not belong to form");
        }
        return toDTO(version);
    }

    private FormField cloneField(FormField f, FormVersion newVersion) {
        return FormField.builder()
            .formVersion(newVersion)
            .fieldLabel(f.getFieldLabel())
            .fieldKey(f.getFieldKey())
            .fieldType(f.getFieldType())
            .isRequired(f.getIsRequired())
            .displayOrder(f.getDisplayOrder())
            .defaultValue(f.getDefaultValue())
            .validationRules(f.getValidationRules())
            .options(f.getOptions())
            .calculationFormula(f.getCalculationFormula())
            .parentColumnName(f.getParentColumnName())
            .isHidden(f.getIsHidden())
            .isReadOnly(f.getIsReadOnly())
            .helpText(f.getHelpText())
            .isDisabled(f.getIsDisabled())
            .isMultiSelect(f.getIsMultiSelect())
            .build();
    }

    private void dropDraftsForVersion(UUID formId, UUID oldVersionId) {
        draftService.dropDraftsForVersion(formId, oldVersionId);
    }

    private FormVersionResponseDTO toDTO(FormVersion version) {
        Object parsedRules = null;
        if (version.getRules() != null && !version.getRules().isBlank() && !version.getRules().equals("[]")) {
            try {
                com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(version.getRules());
                if (rootNode.isObject() && rootNode.has("rules") && rootNode.get("rules").isArray()) {
                    parsedRules = objectMapper.convertValue(rootNode.get("rules"), Object.class);
                } else {
                    parsedRules = objectMapper.convertValue(rootNode, Object.class);
                }
            } catch (Exception e) {
                parsedRules = new ArrayList<>();
            }
        }

        return FormVersionResponseDTO.builder()
            .id(version.getId())
            .versionNumber(version.getVersionNumber())
            .changeLog(version.getChangeLog())
            .isActive(version.getIsActive())
            .activatedBy(version.getActivatedBy())
            .activatedAt(version.getActivatedAt() != null ? version.getActivatedAt().toString() : null)
            .rules(parsedRules)
            .fields(version.getFields().stream().map(this::mapField).collect(Collectors.toList()))
            .build();
    }

    private FormFieldResponseDTO mapField(FormField field) {
        Object parsedOptions = null;
        if (field.getOptions() != null && !field.getOptions().isBlank() && !field.getOptions().equals("[]")) {
            try {
                parsedOptions = objectMapper.readValue(field.getOptions(), Object.class);
            } catch (Exception e) {
                parsedOptions = field.getOptions();
            }
        }
        return FormFieldResponseDTO.builder()
                .id(field.getId())
                .label(field.getFieldLabel())
                .columnName(field.getFieldKey())
                .type(field.getFieldType())
                .required(field.getIsRequired())
                .displayOrder(field.getDisplayOrder())
                .defaultValue(field.getDefaultValue())
                .validation(field.getValidationRules())
                .options(parsedOptions)
                .calculationFormula(field.getCalculationFormula())
                .parentColumnName(field.getParentColumnName())
                .isHidden(field.getIsHidden())
                .isReadOnly(field.getIsReadOnly())
                .helpText(field.getHelpText())
                .isDisabled(field.getIsDisabled())
                .isMultiSelect(field.getIsMultiSelect())
                .children(new ArrayList<>())
                .build();
    }
}
