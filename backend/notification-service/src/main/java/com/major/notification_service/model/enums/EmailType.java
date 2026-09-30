package com.major.notification_service.model.enums;

public enum EmailType {
    WELCOME("Welcome Email"),
    TRIP_CONFIRMATION("Trip Confirmation"),
    TRIP_REMINDER("Trip Reminder"),
    PASSWORD_RESET("Password Reset"),
    NEWSLETTER("Newsletter"),
    PROMOTIONAL("Promotional Email"),
    PAYMENT_SUCCESS("Payment Success"),
    PAYMENT_FAILED("Payment Failed"),
    BOOKING_CONFIRMATION("Booking Confirmation"),
    ACCOUNT_VERIFICATION("Account Verification"),
    REMINDER("Reminder Email"),
    TRIP_UPDATED("Trip Updated"),
    TRIP_CANCELLED("Trip Cancelled");

    private final String description;

    EmailType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public static EmailType fromString(String text) {
        for (EmailType type : EmailType.values()) {
            if (type.description.equalsIgnoreCase(text)) {
                return type;
            }
        }
        return null;
    }
}