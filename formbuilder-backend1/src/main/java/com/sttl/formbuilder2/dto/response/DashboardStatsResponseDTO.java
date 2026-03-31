package com.sttl.formbuilder2.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponseDTO {
    private long totalForms;
    private long publishedForms;
    private long draftForms;
    private long totalSubmissions;
    private List<FormSummaryResponseDTO> recentForms;
}
