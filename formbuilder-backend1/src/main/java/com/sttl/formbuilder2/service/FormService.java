package com.sttl.formbuilder2.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.formbuilder2.dto.request.CreateFormRequestDTO;
import com.sttl.formbuilder2.dto.request.UpdateFormRequestDTO;
import com.sttl.formbuilder2.dto.request.FieldDefinitionRequestDTO;
import com.sttl.formbuilder2.dto.response.FormDetailResponseDTO;
import com.sttl.formbuilder2.dto.response.FormFieldResponseDTO;
import com.sttl.formbuilder2.dto.response.FormSummaryResponseDTO;
import com.sttl.formbuilder2.dto.response.FormVersionResponseDTO;
import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormField;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.model.enums.FormStatus;
import com.sttl.formbuilder2.repository.FormRepository;
import com.sttl.formbuilder2.model.entity.AppUser;
import com.sttl.formbuilder2.model.entity.UserFormRole;
import com.sttl.formbuilder2.model.entity.WorkflowInstance;
import com.sttl.formbuilder2.repository.UserRepository;
import com.sttl.formbuilder2.repository.UserFormRoleRepository;
import com.sttl.formbuilder2.repository.WorkflowInstanceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * FormService — Core Business Logic for Form Management
 *
 * What it does:
 * Orchestrates the full lifecycle of a form: creation, versioning, schema
 * evolution, DTO mapping, and soft-deletion. Called exclusively by
 * {@link com.sttl.formbuilder2.controller.FormController}.
 *
 * Key responsibilities:
 * - Creates Form entities and their initial FormVersion when a builder first
 * saves.
 * - Coordinates with {@code DynamicTableService} to create/evolve the physical
 * PostgreSQL submission table when a form is published or re-published.
 * - Maps between {@code Form} entity graphs and response DTOs, including safely
 * parsing JSON options and rules stored as TEXT/JSONB.
 *
 * Dependencies:
 * - {@code FormRepository} — Spring Data JPA repository for CRUD on
 * {@code forms}.
 * - {@code DynamicTableService} — DDL operations on dynamic submission tables.
 * - {@code ObjectMapper} — Jackson for serialising/deserialising field options
 * and logic rules stored as JSON strings.
 *
 * Transactional behaviour:
 * Write methods are {@code @Transactional} so that the Form entity save and the
 * DDL table operation either both succeed or both roll back.
 */
@Service
@RequiredArgsConstructor
public class FormService {

    private final FormRepository formRepository;
    private final DynamicTableService dynamicTableService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final UserFormRoleRepository userFormRoleRepository;
    private final WorkflowInstanceRepository workflowInstanceRepository;

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

    /**
     * Creates a brand-new form with version 1.
     *
     * Steps:
     * 1. Build and persist the {@link Form} entity to get its generated ID.
     * 2. Build {@link FormVersion} v1, mapping field DTOs to {@link FormField}
     * entities.
     * 3. Serialise logic rules to JSON and store on the version.
     * 4. Set the dynamic table name to {@code sub_{id}_v1}.
     * 5. If status is PUBLISHED, call
     * {@code DynamicTableService.createDynamicTable()}
     * to provision the physical submission table.
     *
     * @param request Incoming payload from POST /api/forms.
     * @return The newly persisted {@link FormDetailResponseDTO} (with generated ID).
     */
    @Transactional
    public FormDetailResponseDTO createForm(CreateFormRequestDTO request) {
        // 1. Build the Form entity
        Form form = new Form();
        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setAllowEditResponse(request.isAllowEditResponse());

        FormStatus incomingStatus = request.getStatus() != null ? request.getStatus() : FormStatus.DRAFT;
        form.setStatus(incomingStatus);

        // Associate the form with the currently logged-in user (both as owner and creator initially)
        AppUser currentUser = getCurrentUser();
        form.setOwner(currentUser);
        form.setCreator(currentUser);
        form.setIssuedByUsername(currentUser.getUsername());

        // Save early to get the generated ID (needed for the dynamic table name)
        form = formRepository.save(form);

        // 2. Build Version 1
        FormVersion version = new FormVersion();
        version.setForm(form);
        version.setVersionNumber(1);

        // 3. Map fields from request DTOs to JPA entities
        version.setFields(mapFields(request.getFields(), version));

        // 4. Serialise logic rules to JSON and store on the version row
        version.setRules(serializeRules(request.getRules()));

        form.getVersions().add(version);

        // 5. Set the dynamic submission table name (e.g. "sub_3_u5_v1")
        // Including the user ID ensures there are no table name collisions across
        // different users
        String dynamicTableName = "sub_" + form.getId() + "_u" + form.getOwner().getId() + "_v1";
        form.setTargetTableName(dynamicTableName);

        // 6. Save everything via cascade (Form → FormVersion → FormField)
        formRepository.save(form);

        // 7. Create the physical PostgreSQL submission table ONLY when publishing
        if (incomingStatus == FormStatus.PUBLISHED) {
            dynamicTableService.createDynamicTable(dynamicTableName, request.getFields());
        }

        auditService.log("FORM_SAVE", currentUser.getUsername(), "FORM", form.getId().toString(), "Form saved as " + incomingStatus);

        return toDetailDTO(form);
    }

    @Transactional
    public void finalizeWorkflowForm(Long formId, AppUser targetOwner, AppUser approver) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new EntityNotFoundException("Form not found"));

        FormStatus oldStatus = form.getStatus();
        // Transition: PENDING_DRAFT -> DRAFT, PENDING_PUBLISH -> PUBLISHED, REJECTED -> REJECTED (handled by rejectStep)
        FormStatus newStatus = (oldStatus == FormStatus.PENDING_PUBLISH) ? FormStatus.PUBLISHED : FormStatus.DRAFT;

        form.setOwner(targetOwner);
        form.setApprovedBy(approver);
        form.setStatus(newStatus);
        formRepository.save(form);

        String currentActor = SecurityContextHolder.getContext().getAuthentication().getName();
        auditService.log("FORM_FINALIZE", currentActor, "FORM", formId.toString(), "Form finalized as " + newStatus);

        // If it was PENDING_PUBLISH, ensure the table is created
        if (newStatus == FormStatus.PUBLISHED) {
            // Get the latest version's fields
            FormVersion latest = form.getVersions().stream()
                    .max((v1, v2) -> Integer.compare(v1.getVersionNumber(), v2.getVersionNumber()))
                    .orElseThrow(() -> new RuntimeException("No versions found for form"));

            // Provision table
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

    // ─────────────────────────────────────────────
    // READ ALL (GET /api/forms)
    // ─────────────────────────────────────────────

    /**
     * Returns a lightweight summary list of all non-archived forms, ordered by
     * most recently updated. Used to populate the dashboard grid of form cards.
     *
     * @return List of {@link FormSummaryResponseDTO} (no versions or fields
     *         loaded).
     */
    public List<FormSummaryResponseDTO> getAllForms() {
        AppUser currentUser = getCurrentUser();
        boolean hasAllAccess = currentUser.getUserFormRoles().stream()
                .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));

        List<Form> forms;
        if (hasAllAccess) {
            forms = formRepository.findAllByStatusNotOrderByUpdatedAtDesc(FormStatus.ARCHIVED);
        } else {
            forms = formRepository.findByOwnerOrIssuedByUsernameAndStatusNot(currentUser, currentUser.getUsername(), FormStatus.ARCHIVED);
        }

        return forms.stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    /**
     * Returns a lightweight summary list of all archived forms.
     */
    public List<FormSummaryResponseDTO> getArchivedForms() {
        AppUser currentUser = getCurrentUser();
        boolean hasAllAccess = currentUser.getUserFormRoles().stream()
                .anyMatch(ufr -> ufr.getRole().getName().equals("ADMIN") || ufr.getRole().getName().equals("ROLE_ADMINISTRATOR"));

        List<Form> forms;
        if (hasAllAccess) {
            forms = formRepository.findByStatusOrderByUpdatedAtDesc(FormStatus.ARCHIVED);
        } else {
            forms = formRepository.findByOwnerOrIssuedByUsernameAndStatus(currentUser, currentUser.getUsername(), FormStatus.ARCHIVED);
        }

        return forms.stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────
    // READ ONE (GET /api/forms/{id})
    // ─────────────────────────────────────────────

    /**
     * Returns the full detail of a form including all versions, fields, options,
     * and logic rules. Used by the builder to reload an existing form and by the
     * admin responses page to build column headers.
     *
     * @param id The internal form ID.
     * @return Fully populated {@link FormDetailResponseDTO}.
     * @throws EntityNotFoundException if no form with this ID exists.
     */
    @Transactional(readOnly = true)
    public FormDetailResponseDTO getFormById(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Form not found with ID: " + id));
        return toDetailDTO(form);
    }

    // ─────────────────────────────────────────────
    // READ BY TOKEN (GET /api/forms/public/{token})
    // ─────────────────────────────────────────────

    /**
     * Resolves a UUID share token to the matching form and returns its full detail.
     * Used exclusively by the public form page ({@code /f/[token]}) to load the
     * schema before rendering the form to a respondent.
     *
     * @param token The {@code publicShareToken} UUID string from the URL.
     * @return Fully populated {@link FormDetailResponseDTO}.
     * @throws RuntimeException if no form with this token exists.
     */
    @Transactional(readOnly = true)
    public FormDetailResponseDTO getFormByToken(String token) {
        Form form = formRepository.findByPublicShareToken(token)
                .orElseThrow(() -> new RuntimeException("Form not found or link is invalid."));
        return toDetailDTO(form);
    }

    // ─────────────────────────────────────────────
    // UPDATE (PUT /api/forms/{id})
    // ─────────────────────────────────────────────

    /**
     * Updates an existing form and creates a new version snapshot.
     *
     * Steps:
     * 1. Update form metadata (title, description, status, allowEditResponse).
     * 2. Create a new {@link FormVersion} with the updated field list and rules,
     * incrementing the version counter for audit history.
     * 3. Depending on the status transition:
     * - DRAFT → PUBLISHED : CREATE TABLE (idempotent, uses IF NOT EXISTS).
     * - PUBLISHED → PUBLISHED : ALTER TABLE to add any new columns.
     * - PUBLISHED → DRAFT : no DDL changes.
     *
     * Schema evolution is additive-only — existing columns are never dropped, so
     * historical submissions remain intact. Removed fields become "ghost columns".
     *
     * @param formId  The ID of the form to update.
     * @param request Incoming payload from PUT /api/forms/{id}.
     * @return The updated {@link FormDetailResponseDTO}.
     */
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

        // Create new version for audit history
        int nextVersionNum = form.getVersions().size() + 1;
        FormVersion newVersion = new FormVersion();
        newVersion.setForm(form);
        newVersion.setVersionNumber(nextVersionNum);
        newVersion.setChangeLog("Updated via Builder");

        newVersion.setFields(mapFields(request.getFields(), newVersion));
        newVersion.setRules(serializeRules(request.getRules()));

        form.getVersions().add(newVersion);
        form = formRepository.save(form);

        // Evolve the physical submission table based on the status transition
        if ((oldStatus == null || oldStatus == FormStatus.DRAFT) && newStatus == FormStatus.PUBLISHED) {
            // Record who approved the form
            form.setApprovedBy(getCurrentUser());
            formRepository.save(form);

            // CREATE TABLE IF NOT EXISTS
            dynamicTableService.createDynamicTable(form.getTargetTableName(), request.getFields());
        } else if (oldStatus == FormStatus.PUBLISHED && newStatus == FormStatus.PUBLISHED) {
            // Only ADD new columns; existing data is never touched
            dynamicTableService.alterDynamicTable(form.getTargetTableName(), request.getFields());
        }

        return toDetailDTO(form);
    }

    // ─────────────────────────────────────────────
    // DELETE / ARCHIVE (DELETE /api/forms/{id})
    // ─────────────────────────────────────────────

    /**
     * Soft-deletes a form by setting its status to ARCHIVED.
     * The form and all its submissions remain in the database — nothing is
     * physically
     * deleted. The form disappears from the dashboard list (filtered by status ≠
     * ARCHIVED).
     *
     * @param id The ID of the form to archive.
     */
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
        
        // 1. Log the audit event first
        auditService.log("FORM_HARD_DELETE", actor, "FORM", id.toString(), "Form permanently deleted: " + form.getTitle());
        
        // 2. Delete related Workflow Instances and Steps (deleteAll triggers cascades)
        List<WorkflowInstance> instances = workflowInstanceRepository.findAllByFormId(id);
        workflowInstanceRepository.deleteAll(instances);
        
        // 3. Delete related User Form Roles (deleteAll triggers cascades/standard cleanup)
        List<UserFormRole> roles = userFormRoleRepository.findAllByFormId(id);
        userFormRoleRepository.deleteAll(roles);
        
        // 4. Drop the physical submission table
        if (tableName != null) {
            dynamicTableService.dropTable(tableName);
        }
        
        // 5. Delete the Form itself (cascades to FormVersion and FormField)
        formRepository.delete(form);
    }

    /**
     * Restores an archived form by setting its status back to DRAFT.
     *
     * @param id The ID of the form to restore.
     */
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
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────

    /**
     * Converts a list of {@link FieldDefinitionRequestDTO}s into {@link FormField}
     * JPA entities for the given version. Also:
     * - Assigns the ordinal position (insertion order = display order).
     * - Derives the SQL column name from the label (e.g. "First Name" →
     * "first_name").
     * - Serialises the {@code options} object to a JSON string for TEXT storage.
     */
    private List<FormField> mapFields(List<FieldDefinitionRequestDTO> fieldDTOs, FormVersion version) {
        List<FormField> allEntities = new ArrayList<>();
        flattenAndMapFields(fieldDTOs, version, null, allEntities);
        return allEntities;
    }

    private void flattenAndMapFields(List<FieldDefinitionRequestDTO> dtos, FormVersion version, String parentColumnName,
            List<FormField> allEntities) {
        if (dtos == null)
            return;
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
            if (colName == null || colName.trim().isEmpty()) {
                colName = dto.getLabel().trim().toLowerCase().replaceAll("[^a-z0-9]+", "_");
            }
            if (colName.length() > 64) {
                colName = colName.substring(0, 60) + "_" + Integer.toHexString(colName.hashCode()).substring(0, 3);
            }
            if (colName.isEmpty() || colName.equals("_")) {
                colName = dto.getType().name().toLowerCase() + "_" + System.nanoTime() % 10000;
            }
            entity.setColumnName(colName);

            allEntities.add(entity);

            // Recursively process children
            if (dto.getChildren() != null && !dto.getChildren().isEmpty()) {
                flattenAndMapFields(dto.getChildren(), version, colName, allEntities);
            }
        }
    }

    /**
     * Serialises a list of rule request DTOs to a JSON string for storage in the
     * {@code form_versions.rules} TEXT column.
     * Returns {@code "[]"} for null/empty lists so the column always holds valid
     * JSON.
     */
    private String serializeRules(Object rules) {
        if (rules == null)
            return "[]";
        if (rules instanceof List && ((List<?>) rules).isEmpty())
            return "[]";
        try {
            return objectMapper.writeValueAsString(rules);
        } catch (Exception e) {
            return "[]";
        }
    }

    /**
     * Maps a {@link Form} to a lightweight {@link FormSummaryResponseDTO} for the
     * dashboard list. Does NOT include versions or fields to keep the response
     * small.
     */
    private FormSummaryResponseDTO toSummaryDTO(Form form) {
        return FormSummaryResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .targetTableName(form.getTargetTableName())
                .publicShareToken(form.getPublicShareToken())
                .allowEditResponse(form.isAllowEditResponse())
                .ownerId(form.getOwner() != null ? form.getOwner().getId() : null)
                .ownerName(form.getOwner() != null ? form.getOwner().getUsername() : "Unknown")
                .approvedByName(form.getApprovedBy() != null ? form.getApprovedBy().getUsername() : null)
                .issuedByUsername(form.getIssuedByUsername())
                .build();
    }

    /**
     * Maps a fully loaded {@link Form} (with versions and fields) to a
     * {@link FormDetailResponseDTO}. This also:
     * - Parses stored JSON options back into Java objects for each field.
     * - Parses stored JSON rules back into an object for the LogicPanel.
     * - Falls back gracefully for legacy data (plain comma-separated strings).
     */
    private FormDetailResponseDTO toDetailDTO(Form form) {
        List<FormVersionResponseDTO> versionDTOs = form.getVersions().stream().map(version -> {

            // Safely parse field options from stored JSON back to Java objects
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
            java.util.Map<String, FormFieldResponseDTO> dtoMap = allFieldDTOs.stream()
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
                        rootFields.add(dto); // Fallback: if parent not found, treat as root
                    }
                }
            }

            // Safely parse rules from stored JSON string back to an object for the frontend
            Object parsedRules = null;
            if (version.getRules() != null && !version.getRules().isBlank() && !version.getRules().equals("[]")) {
                try {
                    parsedRules = objectMapper.readValue(version.getRules(), Object.class);
                } catch (Exception e) {
                    parsedRules = version.getRules();
                }
            }

            return FormVersionResponseDTO.builder()
                    .id(version.getId())
                    .versionNumber(version.getVersionNumber())
                    .changeLog(version.getChangeLog())
                    .rules(parsedRules)
                    .fields(rootFields)
                    .build();
        }).collect(Collectors.toList());

        // Extract theme from metadata within version 0 rules if present
        String themeColor = null;
        String themeFont = null;
        if (!versionDTOs.isEmpty()) {
            Object rules = versionDTOs.get(0).getRules();
            if (rules instanceof java.util.Map) {
                java.util.Map<String, Object> rulesMap = (java.util.Map<String, Object>) rules;
                if (rulesMap.containsKey("theme")) {
                    java.util.Map<String, String> theme = (java.util.Map<String, String>) rulesMap.get("theme");
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
}