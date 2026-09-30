package com.major.trip_service.service;

import com.major.trip_service.dto.AIRequest;
import com.major.trip_service.dto.AIResponse;
import com.major.trip_service.entity.Activity;
import com.major.trip_service.entity.ItineraryDay;
import com.major.trip_service.entity.Trip;
import com.major.trip_service.entity.TripExpense;
import com.major.trip_service.feign.AIServiceClient;
import com.major.trip_service.repo.ActivityRepository;
import com.major.trip_service.repo.ItineraryDayRepository;
import com.major.trip_service.repo.TripExpenseRepository;
import com.major.trip_service.repo.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TripService {

    private final TripRepository tripRepo;
    private final ItineraryDayRepository dayRepo;
    private final ActivityRepository activityRepo;
    private final TripExpenseRepository expenseRepo;
    private final AIServiceClient aiServiceClient;

    public TripService(TripRepository tripRepo,
                       ItineraryDayRepository dayRepo,
                       ActivityRepository activityRepo,
                       TripExpenseRepository expenseRepo,
                       AIServiceClient aiServiceClient) {
        this.tripRepo = tripRepo;
        this.dayRepo = dayRepo;
        this.activityRepo = activityRepo;
        this.expenseRepo = expenseRepo;
        this.aiServiceClient = aiServiceClient;
    }

    // ================= TRIP CRUD =================
    public Trip createTrip(Trip trip) {
        if (trip.getStatus() == null) {
            trip.setStatus(com.major.trip_service.entity.TripStatus.PLANNING);
        }
        return tripRepo.save(trip);
    }

    public Trip updateTrip(Trip trip) {
        return tripRepo.save(trip);
    }

    public Trip getTrip(UUID tripId) {
        return tripRepo.findById(tripId).orElse(null);
    }

    public List<Trip> getTripsByUser(UUID userId) {
        return tripRepo.findAllByUserId(userId);
    }

    @Transactional
    public void deleteTrip(UUID tripId) {
        // Delete related itinerary days and activities
        List<ItineraryDay> itinerary = getItinerary(tripId);
        for (ItineraryDay day : itinerary) {
            if (day.getActivities() != null && !day.getActivities().isEmpty()) {
                activityRepo.deleteAll(day.getActivities());
            }
        }
        dayRepo.deleteAll(itinerary);

        // Delete expenses
        List<TripExpense> expenses = getExpenses(tripId);
        if (!expenses.isEmpty()) {
            expenseRepo.deleteAll(expenses);
        }

        // Delete trip
        tripRepo.deleteById(tripId);
    }

    // ================= ITINERARY =================
    public ItineraryDay addItineraryDay(ItineraryDay day) {
        return dayRepo.save(day);
    }

    public List<ItineraryDay> getItinerary(UUID tripId) {
        return dayRepo.findAllByTripId(tripId);
    }

    public List<ItineraryDay> addFullItinerary(UUID tripId, List<ItineraryDay> itinerary) {
        List<ItineraryDay> savedDays = new ArrayList<>();
        for (int i = 0; i < itinerary.size(); i++) {
            ItineraryDay day = itinerary.get(i);
            day.setTripId(tripId);
            day.setDayNumber(i + 1);
            ItineraryDay savedDay = dayRepo.save(day);

            if (day.getActivities() != null && !day.getActivities().isEmpty()) {
                for (Activity activity : day.getActivities()) {
                    activity.setItineraryDayId(savedDay.getId());
                    activityRepo.save(activity);
                }
            }
            savedDays.add(savedDay);
        }
        return savedDays;
    }

    // ================= ACTIVITIES =================
    public Activity addActivity(Activity activity) {
        return activityRepo.save(activity);
    }

    public List<Activity> getActivities(UUID dayId) {
        return activityRepo.findAllByItineraryDayId(dayId);
    }

    // ================= EXPENSES =================
    public TripExpense addExpense(TripExpense expense) {
        return expenseRepo.save(expense);
    }

    public List<TripExpense> getExpenses(UUID tripId) {
        return expenseRepo.findAllByTripId(tripId);
    }

    // ================= AI TRIP CREATION =================
    public Trip createTripWithAI(Trip trip, List<String> interests) {
        // 1. Ownership/Validation Check
        if (trip.getUserId() == null) {
            throw new RuntimeException("Unauthorized: Trip must be associated with a User ID");
        }

        // Set default status if not set
        if (trip.getStatus() == null) {
            trip.setStatus(com.major.trip_service.entity.TripStatus.PLANNING);
        }

        // Save trip first
        Trip savedTrip = tripRepo.save(trip);

        // Prepare AI request
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(trip.getStartDate(), trip.getEndDate());
        int totalDays = (int) daysBetween + 1;

        AIRequest aiRequest = new AIRequest(
                savedTrip.getDestination(),
                totalDays,
                savedTrip.getBudget(),
                "standard",
                interests != null ? interests : List.of()
        );

        try {
            // Call AI Service via Feign
            AIResponse aiResponse = aiServiceClient.generateItinerary(aiRequest);

            // Save ItineraryDays + Activities from AI response
            if (aiResponse != null && aiResponse.getDailyItinerary() != null) {
                for (Map<String, Object> dayMap : aiResponse.getDailyItinerary()) {
                    ItineraryDay day = new ItineraryDay();
                    day.setTripId(savedTrip.getId());
                    day.setDayNumber((Integer) dayMap.get("day"));
                    day.setTitle((String) dayMap.get("title"));
                    day.setDescription((String) dayMap.get("description"));
                    day.setEstimatedCost(Double.parseDouble(dayMap.get("estimatedCost").toString()));
                    day = dayRepo.save(day);

                    List<Map<String, Object>> activities = (List<Map<String, Object>>) dayMap.get("activities");
                    if (activities != null) {
                        for (Map<String, Object> actMap : activities) {
                            Activity activity = new Activity();
                            activity.setItineraryDayId(day.getId());
                            activity.setActivityName((String) actMap.get("name"));
                            activity.setLocation((String) actMap.get("location"));
                            String timeStr = (String) actMap.getOrDefault("time", null);
                            if (timeStr != null) {
                                activity.setTime(LocalTime.parse(timeStr));
                            }
                            activity.setCost(Double.parseDouble(actMap.get("cost").toString()));
                            activity.setCategory((String) actMap.get("category"));
                            activityRepo.save(activity);
                        }
                    }
                }

                // Save total trip expense from AI estimated budget
                Double estimatedBudget = aiResponse.getEstimatedBudget();
                if (estimatedBudget != null) {
                    TripExpense totalExpense = new TripExpense();
                    totalExpense.setTripId(savedTrip.getId());
                    totalExpense.setCategory("total_ai_estimate");
                    totalExpense.setAmount(aiResponse.getEstimatedBudget());
                    totalExpense.setCurrency("USD");
                    expenseRepo.save(totalExpense);
                }
            }
        } catch (Exception e) {
            // Log error but don't fail trip creation
            System.err.println("AI Service call failed: " + e.getMessage());
        }

        return savedTrip;
    }
}