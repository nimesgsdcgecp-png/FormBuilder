package com.sttl.formbuilder2.dto.response;

import java.util.UUID;

import lombok.Data;

@Data
public class UserResponseDTO {
    private UUID id;
    private String username;
}
