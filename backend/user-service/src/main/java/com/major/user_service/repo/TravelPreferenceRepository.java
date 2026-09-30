package com.major.user_service.repo;

import com.major.user_service.entity.TravelPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TravelPreferenceRepository extends JpaRepository<TravelPreference, UUID> {
    TravelPreference findByUserId(UUID userId);
}