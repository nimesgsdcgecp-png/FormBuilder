package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.UserFormRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserFormRoleRepository extends JpaRepository<UserFormRole, Long> {
    List<UserFormRole> findByUserId(Long userId);
    List<UserFormRole> findByUserIdAndFormId(Long userId, Long formId);
    List<UserFormRole> findByUserIdAndFormIdIsNull(Long userId);
    List<UserFormRole> findByRoleId(Long roleId);
    
    List<UserFormRole> findAllByFormId(Long formId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(Long userId);
}
