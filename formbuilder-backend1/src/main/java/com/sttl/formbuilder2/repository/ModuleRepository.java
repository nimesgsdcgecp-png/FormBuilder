package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModuleRepository extends JpaRepository<Module, UUID> {
    List<Module> findByActiveTrue();
    List<Module> findByIsParentTrueAndActiveTrue();
    List<Module> findByIsSubParentTrueAndParentIdAndActiveTrue(UUID parentId);
    List<Module> findByParentIdAndSubParentIdAndActiveTrue(UUID parentId, UUID subParentId);
}
