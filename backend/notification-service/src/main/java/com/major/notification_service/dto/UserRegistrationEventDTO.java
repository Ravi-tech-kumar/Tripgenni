package com.major.notification_service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegistrationEventDTO {

    @JsonProperty("eventType")
    @Builder.Default
    private String eventType = "USER_REGISTERED";

    @JsonProperty("userId")
    private UUID userId;

    @JsonProperty("email")
    private String email;

    @JsonProperty("fullName")
    private String fullName;

    @JsonProperty("firstName")
    private String firstName;

    @JsonProperty("lastName")
    private String lastName;

    @JsonProperty("verificationToken")
    private String verificationToken;

    @JsonProperty("emailVerified")
    @Builder.Default
    private Boolean emailVerified = false;

    @JsonProperty("registrationDate")
    private String registrationDate;

    @JsonProperty("preferredLanguage")
    @Builder.Default
    private String preferredLanguage = "en";

    @JsonProperty("country")
    private String country;

    @JsonProperty("phoneNumber")
    private String phoneNumber;

    @JsonProperty("dateOfBirth")
    private String dateOfBirth;

    @JsonProperty("profileImageUrl")
    private String profileImageUrl;

    @JsonProperty("registrationMethod")
    private String registrationMethod; // EMAIL, GOOGLE, FACEBOOK, etc.

    @JsonProperty("marketingConsent")
    @Builder.Default
    private Boolean marketingConsent = false;

    @JsonProperty("termsAccepted")
    @Builder.Default
    private Boolean termsAccepted = true;

    @JsonProperty("sourceService")
    @Builder.Default
    private String sourceService = "auth-service";

    @JsonProperty("timestamp")
    private String timestamp;

    @JsonProperty("verificationLink")
    private String verificationLink;

    // Helper method to get display name
    public String getDisplayName() {
        if (fullName != null && !fullName.isEmpty()) {
            return fullName;
        }
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        }
        if (firstName != null) {
            return firstName;
        }
        return email != null ? email.split("@")[0] : "User";
    }

    // Helper method to check if verification is needed
    public boolean isVerificationNeeded() {
        return !emailVerified && verificationToken != null;
    }

    // Helper method to get welcome message based on language
    public String getWelcomeMessage() {
        switch (preferredLanguage) {
            case "es":
                return "¡Bienvenido a TripGennie!";
            case "fr":
                return "Bienvenue sur TripGennie!";
            case "de":
                return "Willkommen bei TripGennie!";
            case "hi":
                return "ट्रिपजेनी में आपका स्वागत है!";
            default:
                return "Welcome to TripGennie!";
        }
    }
}