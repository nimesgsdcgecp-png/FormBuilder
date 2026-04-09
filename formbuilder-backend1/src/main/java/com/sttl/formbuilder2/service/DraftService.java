package com.sttl.formbuilder2.service;

import com.sttl.formbuilder2.model.entity.Form;
import com.sttl.formbuilder2.model.entity.FormSubmissionMeta;
import com.sttl.formbuilder2.model.entity.FormVersion;
import com.sttl.formbuilder2.repository.FormSubmissionMetaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class DraftService {

    private final FormSubmissionMetaRepository metaRepository;
    private final DynamicTableService dynamicTableService;

    public UUID saveDraft(Form form, FormVersion version, Map<String,Object> data, String username) {
        Optional<FormSubmissionMeta> existingMeta = metaRepository
            .findByFormIdAndSubmittedByAndStatus(form.getId(), username, "RESPONSE_DRAFT");

        UUID rowId;
        if (existingMeta.isPresent()) {
            // UPDATE existing draft row
            rowId = existingMeta.get().getSubmissionRowId();
            data.put("id", rowId);
            data.put("updated_at", Instant.now().toString());
            data.put("form_version_id", version.getId());
            dynamicTableService.updateData(form.getTargetTableName(), rowId, data);
        } else {
            // INSERT new draft row
            data.put("form_version_id", version.getId());
            data.put("submitted_by", username);
            data.put("is_draft", true);
            rowId = UUID.randomUUID();
            data.put("id", rowId);
            dynamicTableService.insertData(form.getTargetTableName(), data);
            
            FormSubmissionMeta meta = FormSubmissionMeta.builder()
                .formId(form.getId())
                .formVersionId(version.getId())
                .submissionTable(form.getTargetTableName())
                .submissionRowId(rowId)
                .status("RESPONSE_DRAFT")
                .submittedBy(username)
                .build();
            metaRepository.save(meta);
        }
        return rowId;
    }

    public void dropDraftsForVersion(UUID formId, UUID versionId) {
        List<FormSubmissionMeta> drafts = metaRepository
            .findByFormIdAndIsDeletedFalseAndStatus(formId, "RESPONSE_DRAFT");
        drafts.forEach(meta -> {
            meta.setIsDeleted(true);
            dynamicTableService.deleteRow(meta.getSubmissionTable(), meta.getSubmissionRowId());
        });
        metaRepository.saveAll(drafts);
    }
}
