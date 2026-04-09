package com.sttl.formbuilder2.util;

/**
 * Centralized API Path Constants
 * 
 * Purpose: Single source of truth for all API endpoint paths and versions.
 * When API version changes, update VERSION constant and all paths automatically update.
 * 
 * Usage:
 *   @RequestMapping(ApiConstants.AUTH_BASE)
 *   @GetMapping(ApiConstants.AUTH_ME)
 */
public final class ApiConstants {
    
    private ApiConstants() {
        // Private constructor to prevent instantiation
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }
    
    // ═══════════════════════════════════════════════════════════════
    // VERSION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    /** Current API Version - Change this to update all endpoints */
    public static final String VERSION = "v1";
    
    /** Base API Path */
    public static final String API_BASE = "/api/" + VERSION;
    
    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION & SESSION
    // ═══════════════════════════════════════════════════════════════
    
    public static final String AUTH_BASE = API_BASE + "/auth";
    public static final String AUTH_LOGIN = "/login";
    public static final String AUTH_LOGOUT = "/logout";
    public static final String AUTH_REGISTER = "/register";
    public static final String AUTH_ME = "/me";
    public static final String AUTH_PERMISSIONS = "/permissions";
    
    // ═══════════════════════════════════════════════════════════════
    // FORM MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    public static final String FORMS_BASE = API_BASE + "/forms";
    public static final String FORMS_LIST = "";
    public static final String FORMS_CREATE = "";
    public static final String FORMS_GET = "/{id}";
    public static final String FORMS_UPDATE = "/{id}";
    public static final String FORMS_DELETE = "/{id}";
    public static final String FORMS_RESTORE = "/{id}/restore";
    public static final String FORMS_DELETE_PERMANENT = "/{id}/permanent";
    public static final String FORMS_ARCHIVED = "/archived";
    public static final String FORMS_STATS = "/stats";
    
    // Public Form Access (No Auth Required)
    public static final String FORMS_PUBLIC = "/public/{token}";
    public static final String FORMS_PUBLIC_SUBMISSIONS = "/public/{token}/submissions";
    public static final String FORMS_PUBLIC_SUBMISSION_GET = "/public/{token}/submissions/{submissionId}";
    public static final String FORMS_PUBLIC_SUBMISSION_UPDATE = "/public/{token}/submissions/{submissionId}";
    
    // ═══════════════════════════════════════════════════════════════
    // FORM VERSIONS
    // ═══════════════════════════════════════════════════════════════
    
    public static final String VERSIONS_BASE = API_BASE + "/forms/{formId}/versions";
    public static final String VERSIONS_CREATE = "";
    public static final String VERSIONS_LIST = "";
    public static final String VERSIONS_GET = "/{versionId}";
    public static final String VERSIONS_ACTIVATE = "/{versionId}/activate";
    
    // ═══════════════════════════════════════════════════════════════
    // SUBMISSIONS
    // ═══════════════════════════════════════════════════════════════
    
    public static final String SUBMISSIONS_BASE = "/{id}/submissions";
    public static final String SUBMISSIONS_LIST = "/{id}/submissions";
    public static final String SUBMISSIONS_CREATE = "/{id}/submissions";
    public static final String SUBMISSIONS_GET = "/{formId}/submissions/{submissionId}";
    public static final String SUBMISSIONS_UPDATE = "/{formId}/submissions/{submissionId}";
    public static final String SUBMISSIONS_DELETE = "/{formId}/submissions/{submissionId}";
    public static final String SUBMISSIONS_BULK = "/{formId}/submissions/bulk";
    public static final String SUBMISSIONS_BULK_DELETE = "/{formId}/submissions/bulk";
    public static final String SUBMISSIONS_RESTORE = "/{id}/submissions/{submissionId}/restore";
    public static final String SUBMISSIONS_EXPORT = "/{id}/submissions/export";
    
    // Lookup Values
    public static final String SUBMISSIONS_LOOKUP_VALUES = "/{id}/columns/{fieldKey}/values";
    
    // ═══════════════════════════════════════════════════════════════
    // RUNTIME (Form Fill)
    // ═══════════════════════════════════════════════════════════════
    
    public static final String RUNTIME_BASE = API_BASE + "/runtime";
    public static final String RUNTIME_GET_FORM = "/forms/{formCode}";
    public static final String RUNTIME_SUBMIT = "/forms/{formCode}/submissions";
    public static final String RUNTIME_SAVE_DRAFT = "/forms/{formCode}/drafts";
    
    // ═══════════════════════════════════════════════════════════════
    // WORKFLOW (Approval System)
    // ═══════════════════════════════════════════════════════════════
    
    public static final String WORKFLOW_BASE = API_BASE + "/workflows";
    public static final String WORKFLOW_INITIATE = "/initiate";
    public static final String WORKFLOW_APPROVE = "/steps/{id}/approve";
    public static final String WORKFLOW_REJECT = "/steps/{id}/reject";
    public static final String WORKFLOW_AUTHORITIES = "/available-authorities";
    public static final String WORKFLOW_MY_SUBMISSIONS = "/my-submissions";
    public static final String WORKFLOW_MY_PENDING = "/my-pending";
    public static final String WORKFLOW_MY_HANDLED = "/my-handled";
    public static final String WORKFLOW_FIX_DB = "/fix-db";
    
    // ═══════════════════════════════════════════════════════════════
    // ADMIN - USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    public static final String ADMIN_USERS_BASE = API_BASE + "/admin/users";
    public static final String ADMIN_USERS_LIST = "";
    public static final String ADMIN_USERS_CREATE = "";
    public static final String ADMIN_USERS_GET = "/{id}";
    public static final String ADMIN_USERS_UPDATE = "/{id}";
    public static final String ADMIN_USERS_DELETE = "/{id}";
    public static final String ADMIN_USERS_TOGGLE_DELETE = "/{id}/toggle-delete";
    public static final String ADMIN_USERS_ASSIGN_ROLE = "/{userId}/roles";
    public static final String ADMIN_USERS_REVOKE_ROLE = "/{userId}/roles/{assignmentId}";
    
    // ═══════════════════════════════════════════════════════════════
    // ADMIN - ROLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    public static final String ADMIN_ROLES_BASE = API_BASE + "/admin/roles";
    public static final String ADMIN_ROLES_LIST = "";
    public static final String ADMIN_ROLES_CREATE = "";
    public static final String ADMIN_ROLES_GET = "/{id}";
    public static final String ADMIN_ROLES_UPDATE = "/{id}";
    public static final String ADMIN_ROLES_DELETE = "/{id}";
    
    // ═══════════════════════════════════════════════════════════════
    // ADMIN - PERMISSIONS
    // ═══════════════════════════════════════════════════════════════
    
    public static final String ADMIN_PERMISSIONS_BASE = API_BASE + "/admin/permissions";
    public static final String ADMIN_PERMISSIONS_LIST = "";
    
    // ═══════════════════════════════════════════════════════════════
    // ADMIN - AUDIT LOGS
    // ═══════════════════════════════════════════════════════════════
    
    public static final String ADMIN_AUDIT_BASE = API_BASE + "/admin/audit";
    public static final String ADMIN_AUDIT_LIST = "";
    
    // ═══════════════════════════════════════════════════════════════
    // ADMIN - APPROVAL HISTORY
    // ═══════════════════════════════════════════════════════════════
    
    public static final String ADMIN_APPROVALS_BASE = API_BASE + "/admin/approvals/history";
    public static final String ADMIN_APPROVALS_LIST = "";
    
    // ═══════════════════════════════════════════════════════════════
    // USER PROFILE
    // ═══════════════════════════════════════════════════════════════
    
    public static final String PROFILE_BASE = API_BASE + "/profile";
    public static final String PROFILE_UPDATE = "";
    public static final String PROFILE_CHANGE_PASSWORD = "/change-password";
    
    // ═══════════════════════════════════════════════════════════════
    // MODULES & MENU (Dynamic Navigation)
    // ═══════════════════════════════════════════════════════════════
    
    public static final String MODULES_BASE = API_BASE + "/modules";
    public static final String MODULES_LIST = "";
    
    public static final String MENU_BASE = API_BASE + "/menu";
    public static final String MENU_LIST = "";
    
    // ═══════════════════════════════════════════════════════════════
    // ROLE-MODULE MAPPING
    // ═══════════════════════════════════════════════════════════════
    
    public static final String ROLE_MODULES_BASE = API_BASE + "/roles";
    public static final String ROLE_MODULES_GET = "/{roleId}/modules";
    public static final String ROLE_MODULES_ASSIGN = "/{roleId}/modules";
    public static final String ROLE_MODULES_REVOKE = "/{roleId}/modules/{moduleId}";
    
    // ═══════════════════════════════════════════════════════════════
    // FILE UPLOAD
    // ═══════════════════════════════════════════════════════════════
    
    public static final String FILES_BASE = API_BASE;
    public static final String FILES_UPLOAD = "/upload";
    public static final String FILES_DOWNLOAD = "/files/{filename}";
    
    // ═══════════════════════════════════════════════════════════════
    // LEVEL UP (User Permission Elevation)
    // ═══════════════════════════════════════════════════════════════
    
    public static final String LEVEL_UP_BASE = API_BASE;
    public static final String LEVEL_UP_REQUEST = "/level-up/request";
    public static final String LEVEL_UP_PENDING = "/level-up/pending";
    public static final String LEVEL_UP_DECIDE = "/level-up/{id}/decide";
    
    // ═══════════════════════════════════════════════════════════════
    // RESPONSE CODES (HTTP Status Messages)
    // ═══════════════════════════════════════════════════════════════
    
    public static final class Messages {
        private Messages() {}
        
        // Success Messages
        public static final String LOGIN_SUCCESS = "Login successful";
        public static final String LOGOUT_SUCCESS = "Logout successful";
        public static final String REGISTER_SUCCESS = "User registered successfully";
        public static final String FORM_SAVED = "Form saved successfully";
        public static final String FORM_PUBLISHED = "Form published successfully";
        public static final String SUBMISSION_SUCCESS = "Submission successful";
        public static final String UPDATE_SUCCESS = "Update successful";
        public static final String DELETE_SUCCESS = "Deleted successfully";
        public static final String VERSION_ACTIVATED = "Version activated";
        
        // Error Messages
        public static final String INVALID_CREDENTIALS = "Invalid username or password";
        public static final String USER_EXISTS = "Username already exists";
        public static final String FORM_NOT_FOUND = "Form not found";
        public static final String UNAUTHORIZED = "Unauthorized access";
        public static final String VALIDATION_ERROR = "Validation failed";
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ERROR CODES (Custom Application Errors)
    // ═══════════════════════════════════════════════════════════════
    
    public static final class ErrorCodes {
        private ErrorCodes() {}
        
        public static final String FORM_NOT_FOUND = "FORM_NOT_FOUND";
        public static final String DRAFT_NOT_FOUND = "DRAFT_NOT_FOUND";
        public static final String FORM_ARCHIVED = "FORM_ARCHIVED";
        public static final String DRAFT_DISCARDED = "DRAFT_DISCARDED";
        public static final String UNAUTHORIZED = "UNAUTHORIZED";
        public static final String FORBIDDEN = "FORBIDDEN";
        public static final String FORM_NOT_PUBLISHED = "FORM_NOT_PUBLISHED";
        public static final String DUPLICATE_FORM_CODE = "DUPLICATE_FORM_CODE";
        public static final String VERSION_MISMATCH = "VERSION_MISMATCH";
        public static final String ALREADY_ACTIVE = "ALREADY_ACTIVE";
        public static final String CONCURRENT_SUBMISSION_REJECTED = "CONCURRENT_SUBMISSION_REJECTED";
        public static final String SCHEMA_DRIFT_DETECTED = "SCHEMA_DRIFT_DETECTED";
        public static final String SQL_RESERVED_KEYWORD = "SQL_RESERVED_KEYWORD";
        public static final String TYPE_MISMATCH = "TYPE_MISMATCH";
        public static final String INVALID_FIELD_KEY = "INVALID_FIELD_KEY";
        public static final String TYPE_STABILITY_VIOLATED = "TYPE_STABILITY_VIOLATED";
        public static final String INVALID_FORM_CODE = "INVALID_FORM_CODE";
        public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
        public static final String BAD_REQUEST = "BAD_REQUEST";
    }
}
