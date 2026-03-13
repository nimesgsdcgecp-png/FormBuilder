package com.sttl.formbuilder2.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_configurations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfiguration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", unique = true, nullable = false)
    private String key;

    @Column(name = "config_value")
    private String value;

    @Column(name = "description")
    private String description;
}
