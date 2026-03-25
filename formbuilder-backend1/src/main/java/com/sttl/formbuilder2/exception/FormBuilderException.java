package com.sttl.formbuilder2.exception;

public class FormBuilderException extends RuntimeException {
    private final String errorCode;
    private final java.util.List<java.util.Map<String,String>> details;

    public FormBuilderException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.details = java.util.List.of();
    }

    public FormBuilderException(String errorCode, String message, java.util.List<java.util.Map<String,String>> details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }

    public FormBuilderException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.details = java.util.List.of();
    }

    public String getErrorCode() {
        return errorCode;
    }

    public java.util.List<java.util.Map<String,String>> getDetails() {
        return details;
    }
}
