package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.model.entity.AuditLog;
import com.sttl.formbuilder2.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String actor, String resourceType, String resourceId, String details) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .actor(actor)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .details(details)
                .build();
        auditLogRepository.save(log);
        System.out.println(">>> [AUDIT] " + action + " by " + actor + " on " + resourceType + ":" + resourceId);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void clearLogs() {
        auditLogRepository.softDeleteAll();
    }
}
