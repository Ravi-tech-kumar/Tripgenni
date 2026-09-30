package com.major.trip_service.controller;

import com.major.trip_service.entity.*;
import com.major.trip_service.feign.UserServiceClient;
import com.major.trip_service.service.TripService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}, allowCredentials = "true")
//@CrossOrigin(origins = "*")
public class TripController {

    private final UserServiceClient userServiceClient;
    private final TripService tripService;

    public TripController(UserServiceClient userServiceClient,
                          TripService tripService) {
        this.userServiceClient = userServiceClient;
        this.tripService = tripService;
    }

    // ================= CREATE TRIP =================
    @PostMapping("/ctrip")
    public ResponseEntity<?> createTrip(@RequestBody Trip trip) {
        try {
            UUID userIdFromToken = (UUID) SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getPrincipal();

            if (!userIdFromToken.equals(trip.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("User ID mismatch");
            }

            return ResponseEntity.ok(tripService.createTrip(trip));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication failed: " + e.getMessage());
        }
    }

    // ================= UPDATE TRIP =================
    @PutMapping("/{tripId}")
    public ResponseEntity<?> updateTrip(
            @PathVariable UUID tripId,
            @RequestBody Trip updatedTrip) {

        try {
            UUID userIdFromToken = (UUID) SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getPrincipal();

            Trip existingTrip = tripService.getTrip(tripId);
            if (existingTrip == null) {
                return ResponseEntity.notFound().build();
            }

            // Check authorization
            if (!userIdFromToken.equals(existingTrip.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to update this trip");
            }

            // Update fields
            if (updatedTrip.getDestination() != null) {
                existingTrip.setDestination(updatedTrip.getDestination());
            }
            if (updatedTrip.getStartDate() != null) {
                existingTrip.setStartDate(updatedTrip.getStartDate());
            }
            if (updatedTrip.getEndDate() != null) {
                existingTrip.setEndDate(updatedTrip.getEndDate());
            }
            if (updatedTrip.getBudget() != null) {
                existingTrip.setBudget(updatedTrip.getBudget());
            }
            if (updatedTrip.getStatus() != null) {
                existingTrip.setStatus(updatedTrip.getStatus());
            }
            if (updatedTrip.getDescription() != null) {
                existingTrip.setDescription(updatedTrip.getDescription());
            }

            Trip saved = tripService.updateTrip(existingTrip);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update trip: " + e.getMessage());
        }
    }

    // ================= UPDATE TRIP STATUS =================
    @PatchMapping("/{tripId}/status")
    public ResponseEntity<?> updateTripStatus(
            @PathVariable UUID tripId,
            @RequestParam TripStatus status) {

        try {
            UUID userIdFromToken = (UUID) SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getPrincipal();

            Trip existingTrip = tripService.getTrip(tripId);
            if (existingTrip == null) {
                return ResponseEntity.notFound().build();
            }

            if (!userIdFromToken.equals(existingTrip.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to update this trip");
            }

            existingTrip.setStatus(status);
            Trip saved = tripService.updateTrip(existingTrip);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update status: " + e.getMessage());
        }
    }

    // ================= DELETE TRIP =================
    @DeleteMapping("/{tripId}")
    public ResponseEntity<?> deleteTrip(@PathVariable UUID tripId) {

        try {
            UUID userIdFromToken = (UUID) SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getPrincipal();

            Trip existingTrip = tripService.getTrip(tripId);
            if (existingTrip == null) {
                return ResponseEntity.notFound().build();
            }

            if (!userIdFromToken.equals(existingTrip.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to delete this trip");
            }

            tripService.deleteTrip(tripId);
            return ResponseEntity.ok().body("Trip deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete trip: " + e.getMessage());
        }
    }

    // ================= GET TRIP =================
    @GetMapping("/{tripId}")
    public ResponseEntity<Trip> getTrip(@PathVariable UUID tripId) {
        Trip trip = tripService.getTrip(tripId);
        return (trip != null)
                ? ResponseEntity.ok(trip)
                : ResponseEntity.notFound().build();
    }

    // ================= USER TRIPS =================
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Trip>> getTripsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(tripService.getTripsByUser(userId));
    }

    // ================= EXTERNAL USER =================
    @GetMapping("/external-user/{userId}")
    public ResponseEntity<?> getExternalUserDetails(@PathVariable UUID userId) {
        return ResponseEntity.ok(userServiceClient.getUserById(userId));
    }

    // ================= ITINERARY =================
    @PostMapping("/itinerary")
    public ResponseEntity<ItineraryDay> addItineraryDay(@RequestBody ItineraryDay day) {
        return ResponseEntity.ok(tripService.addItineraryDay(day));
    }

    @GetMapping("/itinerary/{tripId}")
    public ResponseEntity<List<ItineraryDay>> getItinerary(@PathVariable UUID tripId) {
        return ResponseEntity.ok(tripService.getItinerary(tripId));
    }

    // ================= ACTIVITY =================
    @PostMapping("/activity")
    public ResponseEntity<Activity> addActivity(@RequestBody Activity activity) {
        return ResponseEntity.ok(tripService.addActivity(activity));
    }

    @GetMapping("/activity/{dayId}")
    public ResponseEntity<List<Activity>> getActivities(@PathVariable UUID dayId) {
        return ResponseEntity.ok(tripService.getActivities(dayId));
    }

    // ================= EXPENSE =================
    @PostMapping("/expense")
    public ResponseEntity<TripExpense> addExpense(@RequestBody TripExpense expense) {
        return ResponseEntity.ok(tripService.addExpense(expense));
    }

    @GetMapping("/expense/{tripId}")
    public ResponseEntity<List<TripExpense>> getExpenses(@PathVariable UUID tripId) {
        return ResponseEntity.ok(tripService.getExpenses(tripId));
    }

    // ================= AI TRIP =================
    @PostMapping("/ai")
    public ResponseEntity<Trip> createTripWithAI(@RequestBody Trip trip,
                                                 @RequestParam(required = false) List<String> interests) {
        List<String> safeInterests = (interests != null) ? interests : List.of();
        return ResponseEntity.ok(tripService.createTripWithAI(trip, safeInterests));
    }

    // ================= BATCH ITINERARY =================
    @PostMapping("/itinerary/batch/{tripId}")
    public ResponseEntity<?> addFullItinerary(
            @PathVariable UUID tripId,
            @RequestBody List<ItineraryDay> itinerary) {

        try {
            UUID userIdFromToken = (UUID) SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getPrincipal();

            Trip existingTrip = tripService.getTrip(tripId);
            if (existingTrip == null) {
                return ResponseEntity.notFound().build();
            }

            if (!userIdFromToken.equals(existingTrip.getUserId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You don't have permission to update this trip");
            }

            List<ItineraryDay> savedItinerary = tripService.addFullItinerary(tripId, itinerary);
            return ResponseEntity.ok(savedItinerary);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to save itinerary: " + e.getMessage());
        }
    }
}