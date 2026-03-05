package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.enums.FormStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FormRepository extends JpaRepository<Form, Long> {
    // You can add custom queries here later, e.g.:
    // List<Form> findByStatus(FormStatus status);
    List<Form> findByStatusNot(FormStatus status);

    // --- ADD THIS METHOD ---
    Optional<Form> findByPublicShareToken(String publicShareToken);
}