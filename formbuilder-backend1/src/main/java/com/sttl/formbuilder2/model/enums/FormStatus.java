package com.sttl.formbuilder2.model.enums;

/**
 * FormStatus — Lifecycle State of a Form
 *
 * Used to control form visibility and access across the application:
 *
 * DRAFT — The form is being built. It is visible in the dashboard builder
 * but cannot be submitted by respondents via the public /f/{token} URL.
 *
 * PUBLISHED — The form is live. A dynamic submission table has been created in
 * the database and respondents can access and submit it via the
 * public share link.
 *
 * ARCHIVED — Soft-deleted. The form is hidden from the dashboard list
 * ({@code findByStatusNotOrderByUpdatedAtDesc}) but data is preserved
 * in the database for audit purposes.
 */
public enum FormStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED
}