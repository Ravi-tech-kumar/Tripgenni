package com.major.trip_service.repo;


import com.major.trip_service.entity.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    List<Activity> findAllByItineraryDayId(UUID itineraryDayId);
}
