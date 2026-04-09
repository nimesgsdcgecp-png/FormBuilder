package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.LevelUpRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface LevelUpRequestRepository extends JpaRepository<LevelUpRequest, UUID> {
    List<LevelUpRequest> findByStatus(String status);
    Optional<LevelUpRequest> findTopByUserIdAndStatusOrderByRequestedAtDesc(UUID userId, String status);
    List<LevelUpRequest> findByUserId(UUID userId);
}
