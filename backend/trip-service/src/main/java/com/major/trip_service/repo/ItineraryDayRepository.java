package com.major.trip_service.repo;

import com.major.trip_service.entity.ItineraryDay;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, UUID> {
    List<ItineraryDay> findAllByTripId(UUID tripId);
}
