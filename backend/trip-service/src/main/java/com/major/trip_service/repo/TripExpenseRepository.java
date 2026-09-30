package com.major.trip_service.repo;

import com.major.trip_service.entity.TripExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TripExpenseRepository extends JpaRepository<TripExpense, UUID> {
    List<TripExpense> findAllByTripId(UUID tripId);
}
