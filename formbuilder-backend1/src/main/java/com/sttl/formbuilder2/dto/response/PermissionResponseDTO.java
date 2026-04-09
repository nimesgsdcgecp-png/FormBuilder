package com.sttl.formbuilder2.dto.response;

import java.util.UUID;

import lombok.Data;

@Data
public class PermissionResponseDTO {
    private UUID id;
    private String name;
    private String category;
}
