package com.major.notification_service.model.enums;

public enum NotificationStatus {
    PENDING("Message queued for processing"),
    PROCESSING("Currently being processed"),
    SENT("Successfully sent"),
    DELIVERED("Delivered to recipient"),
    OPENED("Opened by recipient"),
    CLICKED("Link clicked by recipient"),
    BOUNCED("Email bounced"),
    FAILED("Failed to send"),
    RETRYING("Retrying to send"),
    COMPLETED("Successfully completed"),
    CANCELLED("Cancelled"),
    EXPIRED("Expired");

    private final String description;

    NotificationStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public boolean isTerminal() {
        return this == SENT || this == DELIVERED || this == OPENED ||
                this == CLICKED || this == BOUNCED || this == FAILED ||
                this == COMPLETED || this == CANCELLED || this == EXPIRED;
    }

    public boolean isSuccessful() {
        return this == SENT || this == DELIVERED || this == OPENED ||
                this == CLICKED || this == COMPLETED;
    }

    public boolean isFailed() {
        return this == FAILED || this == BOUNCED || this == CANCELLED || this == EXPIRED;
    }
}