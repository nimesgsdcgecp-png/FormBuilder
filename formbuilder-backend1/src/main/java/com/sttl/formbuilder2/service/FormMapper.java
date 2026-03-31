package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO;
import com.sttl.formbuilder2.dto.response.FieldValidationResponseDTO;
import com.sttl.formbuilder2.dto.response.FormDetailResponseDTO;
import com.sttl.formbuilder2.dto.response.FormFieldResponseDTO;
import com.sttl.formbuilder2.dto.response.FormSummaryResponseDTO;
import com.sttl.formbuilder2.dto.response.FormVersionResponseDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.repository.FieldValidationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * FormMapper — Dedicated component for mapping between Form Entities and DTOs.
 */
@Component
@RequiredArgsConstructor
public class FormMapper {

    private final ObjectMapper objectMapper;
    private final FieldValidationRepository fieldValidationRepository;

    public FormSummaryResponseDTO toSummaryDTO(Form form) {
        return FormSummaryResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .targetTableName(form.getTargetTableName())
                .code(form.getCode())
                .publicShareToken(form.getPublicShareToken())
                .allowEditResponse(form.isAllowEditResponse())
                .ownerId(form.getOwner() != null ? form.getOwner().getId() : null)
                .ownerName(form.getOwner() != null ? form.getOwner().getUsername() : "Unknown")
                .approvedByName(form.getApprovedBy() != null ? form.getApprovedBy().getUsername() : null)
                .issuedByUsername(form.getIssuedByUsername())
                .build();
    }

    public FormDetailResponseDTO toDetailDTO(Form form) {
        List<FormVersionResponseDTO> versionDTOs = form.getVersions().stream().map(version -> {
            
            // 1. Map all entities to DTOs first (flat list)
            List<FormFieldResponseDTO> allFieldDTOs = version.getFields().stream().map(field -> {
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
                        .fieldLabel(field.getFieldLabel())
                        .columnName(field.getColumnName())
                        .fieldType(field.getFieldType())
                        .isMandatory(field.getIsMandatory())
                        .defaultValue(field.getDefaultValue())
                        .validationRules(field.getValidationRules())
                        .ordinalPosition(field.getOrdinalPosition())
                        .options(parsedOptions)
                        .calculationFormula(field.getCalculationFormula())
                        .helpText(field.getHelpText())
                        .isHidden(field.getIsHidden())
                        .isReadOnly(field.getIsReadOnly())
                        .isDisabled(field.getIsDisabled())
                        .isMultiSelect(field.getIsMultiSelect())
                        .children(new ArrayList<>())
                        .build();
            }).collect(Collectors.toList());

            // 2. Reconstruct tree structure
            List<FormFieldResponseDTO> rootFields = new ArrayList<>();
            Map<String, FormFieldResponseDTO> dtoMap = allFieldDTOs.stream()
                    .collect(Collectors.toMap(FormFieldResponseDTO::getColumnName, dto -> dto));

            for (FormField entity : version.getFields()) {
                FormFieldResponseDTO dto = dtoMap.get(entity.getColumnName());
                if (entity.getParentColumnName() == null) {
                    rootFields.add(dto);
                } else {
                    FormFieldResponseDTO parentDto = dtoMap.get(entity.getParentColumnName());
                    if (parentDto != null) {
                        parentDto.getChildren().add(dto);
                    } else {
                        rootFields.add(dto); 
                    }
                }
            }

            // 3. Parse rules robustly
            Object parsedRules = null;
            if (version.getRules() != null && !version.getRules().isBlank() && !version.getRules().equals("[]")) {
                try {
                    com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(version.getRules());
                    if (rootNode.isObject()) {
                        if (rootNode.has("logic") && rootNode.get("logic").isArray()) {
                            parsedRules = objectMapper.convertValue(rootNode.get("logic"), Object.class);
                        } else if (rootNode.has("rules") && rootNode.get("rules").isArray()) {
                            parsedRules = objectMapper.convertValue(rootNode.get("rules"), Object.class);
                        } else {
                            parsedRules = objectMapper.convertValue(rootNode, Object.class);
                        }
                    } else {
                        parsedRules = objectMapper.convertValue(rootNode, Object.class);
                    }
                } catch (Exception e) {
                    parsedRules = new ArrayList<>();
                }
            }

            // 4. Map existing AST validations
            List<FieldValidationResponseDTO> validationDTOs = fieldValidationRepository
                    .findByFormVersionIdOrderByExecutionOrder(version.getId())
                    .stream().map(fv -> {
                        FieldValidationResponseDTO dto = new FieldValidationResponseDTO();
                        dto.setId(String.valueOf(fv.getId()));
                        dto.setFieldKey(fv.getFieldKey());
                        dto.setScope(fv.getScope());
                        dto.setExpression(fv.getExpression());
                        dto.setErrorMessage(fv.getErrorMessage());
                        dto.setExecutionOrder(fv.getExecutionOrder());
                        return dto;
                    }).collect(Collectors.toList());

            return FormVersionResponseDTO.builder()
                    .id(version.getId())
                    .versionNumber(version.getVersionNumber())
                    .changeLog(version.getChangeLog())
                    .isActive(version.getIsActive())
                    .activatedBy(version.getActivatedBy())
                    .activatedAt(version.getActivatedAt() != null ? version.getActivatedAt().toString() : null)
                    .rules(parsedRules)
                    .formValidations(validationDTOs)
                    .createdAt(version.getCreatedAt() != null ? version.getCreatedAt().toString() : null)
                    .fields(rootFields)
                    .build();
        }).collect(Collectors.toList());

        // Extract theme metadata from the ACTIVE version
        String themeColor = null;
        String themeFont = null;
        FormVersionResponseDTO activeVersionDTO = versionDTOs.stream()
                .filter(FormVersionResponseDTO::getIsActive)
                .findFirst()
                .orElse(!versionDTOs.isEmpty() ? versionDTOs.get(0) : null);

        if (activeVersionDTO != null) {
            Object rules = activeVersionDTO.getRules();
            if (rules instanceof Map) {
                Map<String, Object> rulesMap = (Map<String, Object>) rules;
                if (rulesMap.containsKey("theme")) {
                    Map<String, String> theme = (Map<String, String>) rulesMap.get("theme");
                    themeColor = theme.get("color");
                    themeFont = theme.get("font");
                }
            }
        }

        return FormDetailResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .code(form.getCode())
                .codeLocked(form.getCodeLocked())
                .publicShareToken(form.getPublicShareToken())
                .allowEditResponse(form.isAllowEditResponse())
                .ownerId(form.getOwner() != null ? form.getOwner().getId() : null)
                .themeColor(themeColor)
                .themeFont(themeFont)
                .issuedByUsername(form.getIssuedByUsername())
                .approvalChain(form.getApprovalChain())
                .versions(versionDTOs)
                .build();
    }

    public List<FormField> mapFields(List<FieldDefinitionRequestDTO> fieldDTOs, FormVersion version) {
        List<FormField> allEntities = new ArrayList<>();
        flattenAndMapFields(fieldDTOs, version, null, allEntities);
        return allEntities;
    }

    private void flattenAndMapFields(List<FieldDefinitionRequestDTO> dtos, FormVersion version, String parentColumnName,
                                    List<FormField> allEntities) {
        if (dtos == null) return;
        for (FieldDefinitionRequestDTO dto : dtos) {
            FormField entity = new FormField();
            entity.setFormVersion(version);
            entity.setFieldLabel(dto.getLabel());
            entity.setFieldType(dto.getType());
            entity.setIsMandatory(dto.isRequired());
            entity.setValidationRules(dto.getValidation());
            entity.setDefaultValue(dto.getDefaultValue());
            entity.setCalculationFormula(dto.getCalculationFormula());
            entity.setHelpText(dto.getHelpText());
            entity.setIsHidden(dto.isHidden());
            entity.setIsReadOnly(dto.isReadOnly());
            entity.setIsDisabled(dto.isDisabled());
            entity.setIsMultiSelect(dto.isMultiSelect());
            entity.setParentColumnName(parentColumnName);
            entity.setOrdinalPosition(allEntities.size());

            if (dto.getOptions() != null) {
                try {
                    entity.setOptions(objectMapper.writeValueAsString(dto.getOptions()));
                } catch (Exception e) {
                    entity.setOptions("[]");
                }
            }

            String colName = dto.getColumnName();
            if (colName != null && !colName.trim().isEmpty()) {
                // User provided a custom key — validate it strictly
                if (!colName.matches("^[a-z][a-z0-9_]{0,99}$")) {
                    throw new com.sttl.formbuilder2.exception.FormBuilderException("INVALID_FIELD_KEY", 
                        "Field key '" + colName + "' must start with a letter and contain only lowercase letters, numbers, or underscores (max 100 chars).");
                }
            } else {
                // Generate from label if missing
                colName = dto.getLabel().trim().toLowerCase().replaceAll("[^a-z0-9]+", "");
                if (colName.length() > 100) {
                    colName = colName.substring(0, 96) + "_" + Integer.toHexString(colName.hashCode()).substring(0, 3);
                }
            }

            if (colName.isEmpty()) {
                colName = dto.getType().name().toLowerCase() + "_" + System.nanoTime() % 10000;
            }
            com.sttl.formbuilder2.util.SqlKeywordValidator.validate(colName);
            entity.setColumnName(colName);
            allEntities.add(entity);

            if (dto.getChildren() != null && !dto.getChildren().isEmpty()) {
                flattenAndMapFields(dto.getChildren(), version, colName, allEntities);
            }
        }
    }

    public String serializeRules(Object rules) {
        if (rules == null || (rules instanceof List && ((List<?>) rules).isEmpty())) return "[]";
        try {
            return objectMapper.writeValueAsString(rules);
        } catch (Exception e) {
            return "[]";
        }
    }
}
