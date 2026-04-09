package com.sttl.formbuilder2.repository;

import java.util.UUID;
import com.sttl.formbuilder2.model.entity.SystemConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SystemConfigurationRepository extends JpaRepository<SystemConfiguration, UUID> {
    Optional<SystemConfiguration> findByKey(String key);
}
