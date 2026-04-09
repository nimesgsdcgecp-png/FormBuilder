package com.sttl.formbuilder2.dto.response;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class MenuDTO {
    private UUID id;
    private String name;
    private String url;
    private String icon;
    private List<MenuDTO> children = new ArrayList<>();

    public void addChild(MenuDTO child) {
        this.children.add(child);
    }
}
