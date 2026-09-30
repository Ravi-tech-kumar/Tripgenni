package com.major.notification_service.model.enums;

public enum EventType {
    USER_REGISTERED("User Registration Event"),
    USER_UPDATED("User Update Event"),
    USER_DELETED("User Deletion Event"),
    TRIP_CREATED("Trip Creation Event"),
    TRIP_UPDATED("Trip Update Event"),
    TRIP_CANCELLED("Trip Cancellation Event"),
    TRIP_COMPLETED("Trip Completed Event"),
    PAYMENT_SUCCESS("Payment Success Event"),
    PAYMENT_FAILED("Payment Failed Event"),
    PAYMENT_REFUNDED("Payment Refunded Event"),
    BOOKING_CREATED("Booking Created Event"),
    BOOKING_CONFIRMED("Booking Confirmed Event"),
    BOOKING_CANCELLED("Booking Cancelled Event"),
    REMINDER("Reminder Event"),
    SYSTEM_ALERT("System Alert Event"),
    PROMOTIONAL("Promotional Event");

    private final String description;

    EventType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public static EventType fromString(String text) {
        for (EventType type : EventType.values()) {
            if (type.description.equalsIgnoreCase(text)) {
                return type;
            }
        }
        return null;
    }

    public boolean isUserEvent() {
        return this == USER_REGISTERED || this == USER_UPDATED || this == USER_DELETED;
    }

    public boolean isTripEvent() {
        return this == TRIP_CREATED || this == TRIP_UPDATED ||
                this == TRIP_CANCELLED || this == TRIP_COMPLETED;
    }

    public boolean isPaymentEvent() {
        return this == PAYMENT_SUCCESS || this == PAYMENT_FAILED || this == PAYMENT_REFUNDED;
    }
}