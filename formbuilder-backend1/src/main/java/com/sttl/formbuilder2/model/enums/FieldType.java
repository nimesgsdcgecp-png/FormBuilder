package com.sttl.formbuilder2.model.enums;

/**
 * FieldType — The Type of Input a Form Field Represents
 *
 * Each value maps to:
 * 1. An HTML input rendered on the public form page
 * ({@code /f/[token]/page.tsx}).
 * 2. A PostgreSQL column type in {@code DynamicTableService.mapToSqlType()}.
 * 3. A field card shown in the builder Sidebar.
 *
 * Basic:
 * TEXT — Single-line text input → VARCHAR(500)
 * NUMERIC — Number spinner → INTEGER
 * DATE — Date picker → DATE
 * BOOLEAN — Single checkbox (true/false) → BOOLEAN
 * TEXTAREA — Multi-line text area → TEXT
 *
 * Choice:
 * DROPDOWN — Select menu with predefined options → VARCHAR(500)
 * RADIO — Radio button group (single select) → VARCHAR(500)
 * CHECKBOX_GROUP— Multiple checkboxes (multi-select) → TEXT (JSON array)
 *
 * Special:
 * TIME — Time picker → TIME
 * RATING — Star rating widget → INTEGER
 * SCALE — Linear numeric scale → INTEGER
 * FILE — File upload → VARCHAR(500) (stores URL)
 *
 * Grid:
 * GRID_RADIO — Matrix of radio buttons → TEXT (JSON)
 * GRID_CHECK — Matrix of checkboxes → TEXT (JSON)
 *
 * Lookup:
 * LOOKUP — Populates choices from another published form's submission data
 * at runtime via {@code DynamicTableService.getColumnValues()}.
 * Stored as → VARCHAR(500)
 */
public enum FieldType {
    TEXT,
    NUMERIC,
    DATE,
    BOOLEAN,
    TEXTAREA,

    DROPDOWN,
    RADIO,
    CHECKBOX_GROUP,

    TIME,
    RATING,
    SCALE,

    FILE,

    GRID_RADIO,
    GRID_CHECK,

    LOOKUP,
    CALCULATED,
    SECTION_HEADER,
    INFO_LABEL,
    PAGE_BREAK,
    DATE_TIME,
}