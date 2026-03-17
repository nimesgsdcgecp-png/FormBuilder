package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.RoleModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleModuleRepository extends JpaRepository<RoleModule, Long> {
    
    @org.springframework.data.jpa.repository.Query("SELECT rm FROM RoleModule rm JOIN FETCH rm.module WHERE rm.role.id = :roleId")
    List<RoleModule> findByRoleId(@org.springframework.data.repository.query.Param("roleId") Long roleId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM RoleModule rm WHERE rm.role.id = :roleId")
    void deleteByRoleId(@org.springframework.data.repository.query.Param("roleId") Long roleId);
    
    // Find modules for a specific role that are active
    @org.springframework.data.jpa.repository.Query("SELECT rm FROM RoleModule rm JOIN FETCH rm.module WHERE rm.role.id = :roleId AND rm.module.active = true")
    List<RoleModule> findByRoleIdAndModuleActiveTrue(@org.springframework.data.repository.query.Param("roleId") Long roleId);

    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM RoleModule rm WHERE rm.module.id = :moduleId")
    void deleteByModuleId(@org.springframework.data.repository.query.Param("moduleId") Long moduleId);
}
