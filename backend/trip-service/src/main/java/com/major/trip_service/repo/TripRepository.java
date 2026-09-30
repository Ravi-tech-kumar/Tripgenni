package com.major.trip_service.repo;


import com.major.trip_service.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TripRepository extends JpaRepository<Trip, UUID> {
    List<Trip> findAllByUserId(UUID userId);
//    List<Trip> findByUserId(Long userId);
}
