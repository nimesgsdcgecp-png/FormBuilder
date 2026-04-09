package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.UserFormRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface UserFormRoleRepository extends JpaRepository<UserFormRole, UUID> {
    List<UserFormRole> findByUserId(UUID userId);
    List<UserFormRole> findByUserIdAndFormId(UUID userId, UUID formId);
    List<UserFormRole> findByUserIdAndFormIdIsNull(UUID userId);
    List<UserFormRole> findByRoleId(UUID roleId);
    
    List<UserFormRole> findAllByFormId(UUID formId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(UUID userId);
}
