package com.sttl.formbuilder2.repository;

import com.sttl.formbuilder2.model.entity.LevelUpRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LevelUpRequestRepository extends JpaRepository<LevelUpRequest, Long> {
    List<LevelUpRequest> findByStatus(String status);
    Optional<LevelUpRequest> findTopByUserIdAndStatusOrderByRequestedAtDesc(Long userId, String status);
    List<LevelUpRequest> findByUserId(Long userId);
}
