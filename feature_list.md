# FormBuilder Platform - Feature Implementation Status

This document tracks the progress of the FormBuilder application against the project requirements.

## 1. Remaining Features (MISSING)

### 1.1 Submission Management (High Priority)
- [ ] **Grid Sorting, Filtering, and Pagination**: Currently, the responses page loads all submissions at once and displays them in a static list.
- [ ] **Bulk Operations**: Multi-select entries in the grid and perform bulk actions (e.g., bulk delete).
- [ ] **Advanced Bulk Export**: Support for XLSX export (currently only client-side CSV is available).
- [ ] **Submission States**: Support for "Draft" vs "Final" submission states. Currently, all submissions are immediate and final.

### 1.2 Conditional Logic & Calculations
- [ ] **Calculated Fields**: Mechanism to derive values from other inputs (e.g., `total = price * quantity`).
- [ ] **Enable/Disable Logic**: The ability to conditionally enable or disable fields based on other field values.
- [ ] **Complex Condition Logic**: Support for nested OR/AND conditions (currently limited to single condition or simple AND).

### 1.3 UI & Editor Enhancements
- [ ] **Visual Grouping**: True "Section" containers in the editor (currently `SECTION_HEADER` is just a decorative field).
- [ ] **Read-only/Disabled States**: Support for fields that are natively configured as read-only or disabled.
- [ ] **Hidden/System Fields**: Dedicated field type for metadata that is never shown to the end user but captured in the schema.

---

## 2. Implemented Features (COMPLETED)

### 2.1 Form Definition & Editing
- [x] Visual drag-and-drop editor (`@dnd-kit` integration).
- [x] Field reordering and basic sectioning.
- [x] Multi-step (wizard-style) forms via `PAGE_BREAK`.
- [x] Core Field Types: Text, Numeric, Date, Time, Dropdown, Radio, Checkboxes, Boolean, File Upload, Grid Radio/Check.

### 2.2 Dynamic Rendering & Validation
- [x] Dynamic form rendering from JSON schema.
- [x] Field-level validation (Mandatory, Min/Max, RegEx).
- [x] Conditional show/hide logic.
- [x] Dynamic "Make Required" and custom validation error rules.

### 2.3 Data Persistence
- [x] Dedicated PostgreSQL table-per-form strategy.
- [x] Automated schema evolution (Additive migrations).
- [x] Submission timestamping.
- [x] Lookup fields (Values populated from other form tables).

### 2.4 Security
- [x] Session-based authentication (Spring Security).
- [x] NextJS-based simplified login/register flow.
- [x] Role-based access (Owner vs Respondent).
- [x] Token-based public form sharing.
