package com.sttl.formbuilder2.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflow_instances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    private Form form;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private AppUser creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_builder_id", nullable = false)
    private AppUser targetBuilder;

    @Column(name = "current_step_index")
    private int currentStepIndex;

    @Column(name = "total_steps")
    private int totalSteps;

    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Builder.Default
    @OneToMany(mappedBy = "instance", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepIndex ASC")
    @JsonIgnoreProperties("instance")
    private List<WorkflowStep> steps = new ArrayList<>();

    public enum WorkflowStatus {
        ACTIVE, COMPLETED, REJECTED, CANCELLED
    }
}
