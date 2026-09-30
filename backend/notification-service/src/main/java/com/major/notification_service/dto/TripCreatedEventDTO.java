package com.major.notification_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripCreatedEventDTO {

    @JsonProperty("eventType")
    @Builder.Default
    private String eventType = "TRIP_CREATED";

    @JsonProperty("tripId")
    private UUID tripId;

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("userEmail")
    private String userEmail;

    @JsonProperty("userName")
    private String userName;

    @JsonProperty("destination")
    private String destination;

    @JsonProperty("destinationCountry")
    private String destinationCountry;

    @JsonProperty("destinationCity")
    private String destinationCity;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonProperty("startDate")
    private LocalDate startDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonProperty("endDate")
    private LocalDate endDate;

    @JsonProperty("budget")
    private Double budget;

    @JsonProperty("currency")
    @Builder.Default
    private String currency = "USD";

    @JsonProperty("numberOfTravelers")
    @Builder.Default
    private Integer numberOfTravelers = 1;

    @JsonProperty("tripName")
    private String tripName;

    @JsonProperty("tripDescription")
    private String tripDescription;

    @JsonProperty("accommodationType")
    private String accommodationType;

    @JsonProperty("transportationType")
    private String transportationType;

    @JsonProperty("interests")
    private List<String> interests;

    @JsonProperty("specialRequests")
    private String specialRequests;

    @JsonProperty("bookingReference")
    private String bookingReference;

    @JsonProperty("totalCost")
    private Double totalCost;

    @JsonProperty("paidAmount")
    private Double paidAmount;

    @JsonProperty("paymentStatus")
    private String paymentStatus;

    @JsonProperty("sourceService")
    @Builder.Default
    private String sourceService = "trip-service";

    @JsonProperty("timestamp")
    private String timestamp;

    // Helper method to get formatted date range
    public String getFormattedDateRange() {
        if (startDate != null && endDate != null) {
            return startDate.toString() + " to " + endDate.toString();
        }
        return null;
    }

    // Helper method to get trip duration in days
    public long getDurationInDays() {
        if (startDate != null && endDate != null) {
            return java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate);
        }
        return 0;
    }

    // Helper method to get per person cost
    public Double getCostPerPerson() {
        if (totalCost != null && numberOfTravelers != null && numberOfTravelers > 0) {
            return totalCost / numberOfTravelers;
        }
        return null;
    }
}