package com.sttl.formbuilder2.model.enums;

/**
 * FormStatus — Lifecycle State of a Form
 *
 * DRAFT — Form is being built and is editable by owner/creator.
 * PENDING_DRAFT — Viewer-created form waiting for Builder adoption.
 * PENDING_PUBLISH — User-created draft waiting for publication approval.
 * PUBLISHED — Form is live and accepting submissions.
 * REJECTED — Workflow was rejected; form is returned to creator for fixes.
 * ARCHIVED — Soft-deleted.
 */
public enum FormStatus {
    DRAFT,
    PENDING_DRAFT,
    PENDING_PUBLISH,
    PUBLISHED,
    REJECTED,
    ARCHIVED
}