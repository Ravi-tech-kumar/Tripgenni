package com.major.notification_service.service;

import com.major.notification_service.model.enums.EmailType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.Year;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateService {

    private final SpringTemplateEngine templateEngine;

    // Process a thymeleaf template with the given variables
    public String processTemplate(String templateName, Map<String, Object> variables) {
        try {
            Context context = new Context(Locale.US);
            if (variables != null) {
                context.setVariables(variables);
            }
            String result = templateEngine.process(templateName, context);
            log.debug("Processed template: {}", templateName);
            return result;
        } catch (Exception e) {
            log.error("Error processing template {}: {}", templateName, e.getMessage());
            throw new RuntimeException("Failed to process email template: " + templateName, e);
        }
    }

    // Get template path based on email type
    public String getTemplatePath(EmailType emailType) {
        return switch (emailType) {
            case WELCOME -> "welcome-email";
            case TRIP_CONFIRMATION -> "trip-confirmation";
            case TRIP_REMINDER -> "trip-reminder";
            case PASSWORD_RESET -> "password-reset";
            case NEWSLETTER -> "newsletter";
            case PROMOTIONAL -> "promotional";
            case PAYMENT_SUCCESS -> "payment-success";
            case PAYMENT_FAILED -> "payment-failed";
            case BOOKING_CONFIRMATION -> "booking-confirmation";
            case ACCOUNT_VERIFICATION -> "account-verification";
            case REMINDER -> "reminder";
            case TRIP_UPDATED -> "trip-updated";
            case TRIP_CANCELLED -> "trip-cancelled";
        }; // <-- Added missing semicolon here
    }

    // Enrich template data with common variables
    public Map<String, Object> enrichTemplateData(Map<String, Object> data, EmailType emailType) {
        data.put("currentYear", Year.now().getValue());
        data.put("appName", "TripGennie");
        data.put("supportEmail", "support@tripgennie.com");
        data.put("emailType", emailType.name());
        data.put("currentDate", java.time.LocalDate.now().toString());
        return data;
    }

    // Validate if template exists
    public boolean validateTemplate(String templateName) {
        try {
            Context context = new Context(Locale.US);
            templateEngine.process(templateName, context);
            return true;
        } catch (Exception e) {
            log.warn("Template validation failed for: {}", templateName);
            return false;
        }
    }
}