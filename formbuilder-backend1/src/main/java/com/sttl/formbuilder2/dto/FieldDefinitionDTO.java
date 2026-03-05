package com.sttl.formbuilder2.dto;

import com.sttl.formbuilder2.model.enums.FieldType;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class FieldDefinitionDTO {
    private String label;
    private FieldType type;
    private boolean required;
    private Map<String, Object> validation; // min, max, regex
    private String defaultValue; // <--- ADD THIS

    private Object options; // Frontend sends ["A", "B"], we convert to JSON
}