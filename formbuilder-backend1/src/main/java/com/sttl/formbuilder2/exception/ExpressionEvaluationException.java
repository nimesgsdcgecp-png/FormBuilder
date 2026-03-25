package com.sttl.formbuilder2.exception;

import lombok.Getter;

@Getter
public class ExpressionEvaluationException extends RuntimeException {
    private final String expressionId;
    private final String context; 

    public ExpressionEvaluationException(String msg, String expressionId, String context) {
        super(msg);
        this.expressionId = expressionId;
        this.context = context;
    }

    public ExpressionEvaluationException(String msg, Throwable cause) {
        super(msg, cause);
        this.expressionId = "UNKNOWN";
        this.context = "UNKNOWN";
    }
}
