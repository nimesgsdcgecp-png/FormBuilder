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
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
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
    private final ObjectMapper objectMapper;

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
     * @return The newly persisted {@link Form} entity (with generated ID).
     */
    @Transactional
    public Form createForm(CreateFormRequestDTO request) {
        // 1. Build the Form entity
        Form form = new Form();
        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setAllowEditResponse(request.isAllowEditResponse());

        FormStatus incomingStatus = request.getStatus() != null ? request.getStatus() : FormStatus.DRAFT;
        form.setStatus(incomingStatus);

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

        // 5. Set the dynamic submission table name (e.g. "sub_3_v1")
        String dynamicTableName = "sub_" + form.getId() + "_v1";
        form.setTargetTableName(dynamicTableName);

        // 6. Save everything via cascade (Form → FormVersion → FormField)
        formRepository.save(form);

        // 7. Create the physical PostgreSQL submission table ONLY when publishing
        if (incomingStatus == FormStatus.PUBLISHED) {
            dynamicTableService.createDynamicTable(dynamicTableName, request.getFields());
        }

        return form;
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
        List<Form> forms = formRepository.findByStatusNotOrderByUpdatedAtDesc(FormStatus.ARCHIVED);
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
     * @return The updated {@link Form} entity.
     */
    @Transactional
    public Form updateForm(Long formId, UpdateFormRequestDTO request) {
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
            // CREATE TABLE IF NOT EXISTS — safe to re-call if previously published then
            // drafted
            dynamicTableService.createDynamicTable(form.getTargetTableName(), request.getFields());
        } else if (oldStatus == FormStatus.PUBLISHED && newStatus == FormStatus.PUBLISHED) {
            // Only ADD new columns; existing data is never touched
            dynamicTableService.alterDynamicTable(form.getTargetTableName(), request.getFields());
        }

        return form;
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
        List<FormField> formFields = new ArrayList<>();
        int ordinal = 0;
        for (FieldDefinitionRequestDTO fieldDTO : fieldDTOs) {
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

            // Derive SQL column name: "First Name" → "first_name"
            String colName = fieldDTO.getLabel().trim().toLowerCase().replaceAll("[^a-z0-9]+", "_");
            field.setColumnName(colName);

            formFields.add(field);
        }
        return formFields;
    }

    /**
     * Serialises a list of rule request DTOs to a JSON string for storage in the
     * {@code form_versions.rules} TEXT column.
     * Returns {@code "[]"} for null/empty lists so the column always holds valid
     * JSON.
     */
    private String serializeRules(List<?> rules) {
        if (rules == null || rules.isEmpty())
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
            List<FormFieldResponseDTO> fieldDTOs = version.getFields().stream().map(field -> {
                Object parsedOptions = null;
                if (field.getOptions() != null && !field.getOptions().isBlank() && !field.getOptions().equals("[]")) {
                    try {
                        parsedOptions = objectMapper.readValue(field.getOptions(), Object.class);
                    } catch (Exception e) {
                        // Legacy data: plain comma-separated string like "Yes,No"
                        // Return as-is; frontend handles the split gracefully.
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
                        .build();
            }).collect(Collectors.toList());

            // Safely parse rules from stored JSON string back to an object for the frontend
            Object parsedRules = null;
            if (version.getRules() != null && !version.getRules().isBlank() && !version.getRules().equals("[]")) {
                try {
                    parsedRules = objectMapper.readValue(version.getRules(), Object.class);
                } catch (Exception e) {
                    parsedRules = version.getRules(); // Return raw string as last-resort fallback
                }
            }

            return FormVersionResponseDTO.builder()
                    .id(version.getId())
                    .versionNumber(version.getVersionNumber())
                    .changeLog(version.getChangeLog())
                    .rules(parsedRules)
                    .fields(fieldDTOs)
                    .build();
        }).collect(Collectors.toList());

        return FormDetailResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .status(form.getStatus())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .publicShareToken(form.getPublicShareToken())
                .allowEditResponse(form.isAllowEditResponse())
                .versions(versionDTOs)
                .build();
    }
}