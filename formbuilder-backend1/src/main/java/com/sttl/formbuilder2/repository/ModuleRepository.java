package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {
    List<Module> findByActiveTrue();
    List<Module> findByIsParentTrueAndActiveTrue();
    List<Module> findByIsSubParentTrueAndParentIdAndActiveTrue(Long parentId);
    List<Module> findByParentIdAndSubParentIdAndActiveTrue(Long parentId, Long subParentId);
}
