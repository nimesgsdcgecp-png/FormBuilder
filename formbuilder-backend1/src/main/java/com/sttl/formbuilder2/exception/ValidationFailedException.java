package com.sttl.formbuilder2.exception;

import java.util.List;

import java.util.Map;

public class ValidationFailedException extends FormBuilderException {
    public ValidationFailedException(String errorCode, String message, List<Map<String,String>> details) {
        super(errorCode, message, details);
    }
}
