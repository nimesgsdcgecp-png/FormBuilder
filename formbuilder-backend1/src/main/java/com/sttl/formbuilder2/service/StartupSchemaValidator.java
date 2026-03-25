package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * StartupSchemaValidator — Fail-fast protection against manual database changes.
 * 
 * This service runs immediately after the application has started.
 * It iterates through all forms and verifies that their dynamic tables
 * and columns match the definitions in the latest active version.
 * 
 * If a mismatch is detected (e.g. a column was manually dropped),
 * it throws an IllegalStateException, effectively crashing the application
 * during boot to prevent runtime data corruption.
 */
@Service
@RequiredArgsConstructor
public class StartupSchemaValidator {

    private final FormRepository formRepository;
    private final DynamicTableService dynamicTableService;

    @org.springframework.transaction.annotation.Transactional
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        System.out.println(">>> [STARTUP] Running Schema Drift Check...");
        List<Form> allForms = formRepository.findAll();
        int checkedCount = 0;
        
        for (Form form : allForms) {
            // Only check forms that are currently PUBLISHED
            if (form.getStatus() == com.sttl.formbuilder2.model.enums.FormStatus.PUBLISHED 
                && form.getTargetTableName() != null 
                && !form.getTargetTableName().isEmpty()) {
                try {
                    dynamicTableService.validateNoSchemaDrift(form);
                    checkedCount++;
                } catch (Exception e) {
                    System.err.println("*****************************************************************");
                    System.err.println(">>> [STARTUP FAIL] SCHEMA DRIFT DETECTED");
                    System.err.println(">>> Form: " + form.getTitle() + " (ID: " + form.getId() + ")");
                    System.err.println(">>> Table: " + form.getTargetTableName());
                    System.err.println(">>> Error: " + e.getMessage());
                    System.err.println(">>> ACTION REQUIRED: Restore the missing columns in SQL or");
                    System.err.println(">>> update the form definition to match the current DB state.");
                    System.err.println("*****************************************************************");
                    
                    // Throwing IllegalStateException during startup will cause the context to close
                    throw new IllegalStateException("[STARTUP FAIL] Schema drift detected for table: " + form.getTargetTableName(), e);
                }
            }
        }
        
        System.out.println(">>> [STARTUP] Schema Drift Check Completed. Verified " + checkedCount + " dynamic tables.");
    }
}
