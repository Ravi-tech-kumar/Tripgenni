package com.major.user_service.repo;

import com.major.user_service.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    UserProfile findByAuthUserId(UUID authUserId);
}