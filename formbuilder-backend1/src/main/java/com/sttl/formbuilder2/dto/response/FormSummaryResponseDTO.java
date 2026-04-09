package com.sttl.formbuilder2.dto.response;

import java.util.UUID;

import com.sttl.formbuilder2.model.enums.FormStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * FormSummaryResponseDTO — Lightweight Form Card for the Dashboard
 *
 * What it does:
 * Returned by GET /api/forms. Contains only the high-level metadata needed
 * to render a form card on the dashboard (title, status, token for the share
 * link) without loading the full schema, versions, or fields.
 *
 * Application flow:
 * FormController.getAllForms()
 * → FormService.getAllForms() → List<FormSummaryResponseDTO>
 * → Dashboard page (app/page.tsx) renders one card per DTO
 *
 * Design choice:
 * Using a dedicated summary DTO (instead of returning the full Form entity)
 * avoids the N+1 query problem — no versions or fields are fetched for the
 * dashboard list. The {@code allowEditResponse} field is intentionally excluded
 * here since the dashboard only needs it when opening the builder or public
 * form.
 */
@Data
@Builder
public class FormSummaryResponseDTO {
    private UUID id;
    @com.fasterxml.jackson.annotation.JsonProperty("title")
    private String name;
    private String description;
    private FormStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private String targetTableName;
    private String code;
    private String publicShareToken;
    private boolean allowEditResponse;
    private UUID ownerId;
    private String ownerName;
    private String approvedByName;
    private String issuedByUsername;
    private String approvalChain;
}
