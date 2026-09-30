package com.major.user_service.repo;

import com.major.user_service.entity.SavedDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SavedDestinationRepository extends JpaRepository<SavedDestination, UUID> {
    List<SavedDestination> findAllByUserId(UUID userId);
}