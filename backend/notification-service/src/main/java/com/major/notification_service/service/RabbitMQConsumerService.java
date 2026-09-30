package com.major.notification_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.TripCreatedEventDTO;
import com.major.notification_service.dto.UserRegistrationEventDTO;
import com.major.notification_service.model.NotificationEvent;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.EventType;
import com.major.notification_service.model.enums.NotificationStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RabbitMQConsumerService {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    // Consume messages from notification queue
    @RabbitListener(queues = "${rabbitmq.queue.notification}")
    public void consumeNotification(String message) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Received notification message [{}]: {}", correlationId, message);

        try {
            Map<String, Object> messageMap = objectMapper.readValue(message, Map.class);
            String eventTypeStr = (String) messageMap.get("eventType");

            if (eventTypeStr == null) {
                log.error("Message [{}] missing eventType field", correlationId);
                return;
            }

            EventType eventType = EventType.valueOf(eventTypeStr);

            // Create notification event
            NotificationEvent notificationEvent = NotificationEvent.builder()
                    .correlationId(correlationId)
                    .eventType(eventType)
                    .sourceService((String) messageMap.get("sourceService"))
                    .payload(messageMap)
                    .status(NotificationStatus.PENDING)
                    .build();

            notificationService.saveEvent(notificationEvent);

            // Process based on event type
            switch (eventType) {
                case USER_REGISTERED:
                    handleUserRegistration(message, correlationId, notificationEvent);
                    break;
                case TRIP_CREATED:
                    handleTripCreated(message, correlationId, notificationEvent);
                    break;
                case TRIP_UPDATED:
                    handleTripUpdated(message, correlationId, notificationEvent);
                    break;
                case TRIP_CANCELLED:
                    handleTripCancelled(message, correlationId, notificationEvent);
                    break;
                case PAYMENT_SUCCESS:
                    handlePaymentSuccess(message, correlationId, notificationEvent);
                    break;
                case PAYMENT_FAILED:
                    handlePaymentFailed(message, correlationId, notificationEvent);
                    break;
                case REMINDER:
                    handleReminder(message, correlationId, notificationEvent);
                    break;
                default:
                    log.warn("Unhandled event type: {}", eventType);
                    notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.FAILED);
            }

        } catch (Exception e) {
            log.error("Error processing notification message [{}]: {}", correlationId, e.getMessage(), e);
        }
    }

    // Handle user registration event
    private void handleUserRegistration(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        UserRegistrationEventDTO event = objectMapper.readValue(message, UserRegistrationEventDTO.class);
        log.info("Processing user registration for: {}", event.getEmail());

        // Prepare welcome email
        Map<String, Object> templateData = new HashMap<>();
        templateData.put("name", event.getFullName());
        templateData.put("email", event.getEmail());
        templateData.put("verificationLink",
                "http://localhost:8080/api/auth/verify?token=" + event.getVerificationToken());
        templateData.put("preferredLanguage", event.getPreferredLanguage());

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(event.getEmail())
                .subject("Welcome to TripGennie!")
                .emailType(EmailType.WELCOME)
                .templateName("welcome-email")
                .templateData(templateData)
                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
                .build();

        // Send email
        emailService.sendEmail(emailRequest);

        // Update event status
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("User registration processed successfully for: {}", event.getEmail());
    }

    // Handle trip created event
    private void handleTripCreated(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        TripCreatedEventDTO event = objectMapper.readValue(message, TripCreatedEventDTO.class);
        log.info("Processing trip creation for destination: {}", event.getDestination());

        // Prepare trip confirmation email
        Map<String, Object> templateData = new HashMap<>();
        templateData.put("userName", event.getUserName());
        templateData.put("destination", event.getDestination());
        templateData.put("startDate", event.getStartDate());
        templateData.put("endDate", event.getEndDate());
        templateData.put("budget", event.getBudget());
        templateData.put("tripId", event.getTripId());
        templateData.put("currency", event.getCurrency());
        templateData.put("numberOfTravelers", event.getNumberOfTravelers());

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(event.getUserEmail())
                .subject("Your Trip to " + event.getDestination() + " is Confirmed!")
                .emailType(EmailType.TRIP_CONFIRMATION)
                .templateName("trip-confirmation")
                .templateData(templateData)
                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
                .build();

        // Send email
        emailService.sendEmail(emailRequest);

        // Update event status
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("Trip creation processed successfully for destination: {}", event.getDestination());
    }

    // Handle trip updated event
    private void handleTripUpdated(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        TripCreatedEventDTO event = objectMapper.readValue(message, TripCreatedEventDTO.class);
        log.info("Processing trip update for destination: {}", event.getDestination());

        Map<String, Object> templateData = new HashMap<>();
        templateData.put("userName", event.getUserName());
        templateData.put("destination", event.getDestination());
        templateData.put("startDate", event.getStartDate());
        templateData.put("endDate", event.getEndDate());
        templateData.put("tripId", event.getTripId());

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(event.getUserEmail())
                .subject("Your Trip to " + event.getDestination() + " has been Updated")
                .emailType(EmailType.TRIP_UPDATED)
                .templateName("trip-updated")
                .templateData(templateData)
                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
                .build();

        emailService.sendEmail(emailRequest);
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("Trip update processed successfully");
    }

    // Handle trip cancelled event
    private void handleTripCancelled(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        TripCreatedEventDTO event = objectMapper.readValue(message, TripCreatedEventDTO.class);
        log.info("Processing trip cancellation for destination: {}", event.getDestination());

        Map<String, Object> templateData = new HashMap<>();
        templateData.put("userName", event.getUserName());
        templateData.put("destination", event.getDestination());
        templateData.put("tripId", event.getTripId());

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(event.getUserEmail())
                .subject("Your Trip to " + event.getDestination() + " has been Cancelled")
                .emailType(EmailType.TRIP_CANCELLED)
                .templateName("trip-cancelled")
                .templateData(templateData)
                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
                .build();

        emailService.sendEmail(emailRequest);
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("Trip cancellation processed successfully");
    }

    // Handle payment success event
    private void handlePaymentSuccess(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        Map<String, Object> event = objectMapper.readValue(message, Map.class);
        log.info("Processing payment success");

        String userEmail = (String) event.get("userEmail");
        String userName = (String) event.get("userName");
        Double amount = (Double) event.get("amount");

        Map<String, Object> templateData = new HashMap<>();
        templateData.put("userName", userName);
        templateData.put("amount", amount);
        templateData.put("paymentId", event.get("paymentId"));

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(userEmail)
                .subject("Payment Successful!")
                .emailType(EmailType.PAYMENT_SUCCESS)
                .templateName("payment-success")
                .templateData(templateData)
                .build();

        emailService.sendEmail(emailRequest);
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("Payment success email sent");
    }

    // Handle payment failed event
    private void handlePaymentFailed(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        Map<String, Object> event = objectMapper.readValue(message, Map.class);
        log.info("Processing payment failure");

        String userEmail = (String) event.get("userEmail");
        String userName = (String) event.get("userName");
        String reason = (String) event.get("reason");

        Map<String, Object> templateData = new HashMap<>();
        templateData.put("userName", userName);
        templateData.put("reason", reason);
        templateData.put("paymentId", event.get("paymentId"));

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(userEmail)
                .subject("Payment Failed")
                .emailType(EmailType.PAYMENT_FAILED)
                .templateName("payment-failed")
                .templateData(templateData)
                .build();

        emailService.sendEmail(emailRequest);
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("Payment failure email sent");
    }

    // Handle reminder event
    private void handleReminder(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
        Map<String, Object> event = objectMapper.readValue(message, Map.class);
        log.info("Processing reminder");

        String userEmail = (String) event.get("userEmail");
        String userName = (String) event.get("userName");
        String reminderType = (String) event.get("reminderType");
        String reminderDate = (String) event.get("reminderDate");
        String reminderMessage = (String) event.get("message");

        Map<String, Object> templateData = new HashMap<>();
        templateData.put("userName", userName);
        templateData.put("reminderType", reminderType);
        templateData.put("reminderDate", reminderDate);
        templateData.put("message", reminderMessage);

        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
                .to(userEmail)
                .subject("Reminder: " + reminderType)
                .emailType(EmailType.REMINDER)
                .templateName("reminder")
                .templateData(templateData)
                .build();

        emailService.sendEmail(emailRequest);
        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
        log.info("Reminder email sent");
    }

    // Handle dead letter queue messages (failed messages)
    @RabbitListener(queues = "${rabbitmq.queue.dead-letter}")
    public void consumeDeadLetter(String message) {
        log.error("Received dead letter message: {}", message);
        // Log to database or alert system
    }
}

//package com.major.notification_service.service;
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import com.major.notification_service.dto.EmailRequestDTO;
//import com.major.notification_service.dto.TripCreatedEventDTO;
//import com.major.notification_service.dto.UserRegistrationEventDTO;
//import com.major.notification_service.model.NotificationEvent;
//import com.major.notification_service.model.enums.EmailType;
//import com.major.notification_service.model.enums.EventType;
//import com.major.notification_service.model.enums.NotificationStatus;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.amqp.rabbit.annotation.RabbitListener;
//import org.springframework.stereotype.Service;
//
//import java.util.HashMap;
//import java.util.Map;
//import java.util.UUID;
//
//@Slf4j
//@Service
//@RequiredArgsConstructor
//public class RabbitMQConsumerService {
//
//    private final NotificationService notificationService;
//    private final EmailService emailService;
//    private final ObjectMapper objectMapper;
//
//    /**
//     * Consume messages from notification queue
//     */
//    @RabbitListener(queues = "${rabbitmq.queue.notification}")
//    public void consumeNotification(String message) {
//        String correlationId = UUID.randomUUID().toString();
//        log.info("Received notification message [{}]: {}", correlationId, message);
//
//        try {
//            Map<String, Object> messageMap = objectMapper.readValue(message, Map.class);
//            String eventTypeStr = (String) messageMap.get("eventType");
//
//            if (eventTypeStr == null) {
//                log.error("Message [{}] missing eventType field", correlationId);
//                return;
//            }
//
//            EventType eventType = EventType.valueOf(eventTypeStr);
//
//            // Create notification event
//            NotificationEvent notificationEvent = NotificationEvent.builder()
//                    .correlationId(correlationId)
//                    .eventType(eventType)
//                    .sourceService((String) messageMap.get("sourceService"))
//                    .payload(messageMap)
//                    .status(NotificationStatus.PENDING)
//                    .build();
//
//            notificationService.saveEvent(notificationEvent);
//
//            // Process based on event type
//            switch (eventType) {
//                case USER_REGISTERED:
//                    handleUserRegistration(message, correlationId, notificationEvent);
//                    break;
//                case TRIP_CREATED:
//                    handleTripCreated(message, correlationId, notificationEvent);
//                    break;
//                case TRIP_UPDATED:
//                    handleTripUpdated(message, correlationId, notificationEvent);
//                    break;
//                case TRIP_CANCELLED:
//                    handleTripCancelled(message, correlationId, notificationEvent);
//                    break;
//                case PAYMENT_SUCCESS:
//                    handlePaymentSuccess(message, correlationId, notificationEvent);
//                    break;
//                case PAYMENT_FAILED:
//                    handlePaymentFailed(message, correlationId, notificationEvent);
//                    break;
//                case REMINDER:
//                    handleReminder(message, correlationId, notificationEvent);
//                    break;
//                default:
//                    log.warn("Unhandled event type: {}", eventType);
//                    notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.FAILED);
//            }
//
//        } catch (Exception e) {
//            log.error("Error processing notification message [{}]: {}", correlationId, e.getMessage(), e);
//        }
//    }
//
//    /**
//     * Handle user registration event
//     */
//    private void handleUserRegistration(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        UserRegistrationEventDTO event = objectMapper.readValue(message, UserRegistrationEventDTO.class);
//        log.info("Processing user registration for: {}", event.getEmail());
//
//        // Prepare welcome email
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("name", event.getFullName());
//        templateData.put("email", event.getEmail());
//        templateData.put("verificationLink",
//                "http://localhost:8080/api/auth/verify?token=" + event.getVerificationToken());
//        templateData.put("preferredLanguage", event.getPreferredLanguage());
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(event.getEmail())
//                .subject("Welcome to TripGennie!")
//                .emailType(EmailType.WELCOME)
//                .templateName("welcome-email")
//                .templateData(templateData)
//                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
//                .build();
//
//        // Send email
//        emailService.sendEmail(emailRequest);
//
//        // Update event status
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("User registration processed successfully for: {}", event.getEmail());
//    }
//
//    /**
//     * Handle trip created event
//     */
//    private void handleTripCreated(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        TripCreatedEventDTO event = objectMapper.readValue(message, TripCreatedEventDTO.class);
//        log.info("Processing trip creation for destination: {}", event.getDestination());
//
//        // Prepare trip confirmation email
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("userName", event.getUserName());
//        templateData.put("destination", event.getDestination());
//        templateData.put("startDate", event.getStartDate());
//        templateData.put("endDate", event.getEndDate());
//        templateData.put("budget", event.getBudget());
//        templateData.put("tripId", event.getTripId());
//        templateData.put("currency", event.getCurrency());
//        templateData.put("numberOfTravelers", event.getNumberOfTravelers());
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(event.getUserEmail())
//                .subject("Your Trip to " + event.getDestination() + " is Confirmed!")
//                .emailType(EmailType.TRIP_CONFIRMATION)
//                .templateName("trip-confirmation")
//                .templateData(templateData)
//                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
//                .build();
//
//        // Send email
//        emailService.sendEmail(emailRequest);
//
//        // Update event status
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("Trip creation processed successfully for destination: {}", event.getDestination());
//    }
//
//    /**
//     * Handle trip updated event
//     */
//    private void handleTripUpdated(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        TripCreatedEventDTO event = objectMapper.readValue(message, TripCreatedEventDTO.class);
//        log.info("Processing trip update for destination: {}", event.getDestination());
//
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("userName", event.getUserName());
//        templateData.put("destination", event.getDestination());
//        templateData.put("startDate", event.getStartDate());
//        templateData.put("endDate", event.getEndDate());
//        templateData.put("tripId", event.getTripId());
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(event.getUserEmail())
//                .subject("Your Trip to " + event.getDestination() + " has been Updated")
//                .emailType(EmailType.TRIP_CONFIRMATION)
//                .templateName("trip-updated")
//                .templateData(templateData)
//                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
//                .build();
//
//        emailService.sendEmail(emailRequest);
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("Trip update processed successfully");
//    }
//
//    /**
//     * Handle trip cancelled event
//     */
//    private void handleTripCancelled(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        TripCreatedEventDTO event = objectMapper.readValue(message, TripCreatedEventDTO.class);
//        log.info("Processing trip cancellation for destination: {}", event.getDestination());
//
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("userName", event.getUserName());
//        templateData.put("destination", event.getDestination());
//        templateData.put("tripId", event.getTripId());
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(event.getUserEmail())
//                .subject("Your Trip to " + event.getDestination() + " has been Cancelled")
//                .emailType(EmailType.TRIP_CONFIRMATION)
//                .templateName("trip-cancelled")
//                .templateData(templateData)
//                .userId(event.getUserId() != null ? event.getUserId().toString() : null)
//                .build();
//
//        emailService.sendEmail(emailRequest);
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("Trip cancellation processed successfully");
//    }
//
//    /**
//     * Handle payment success event
//     */
//    private void handlePaymentSuccess(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        Map<String, Object> event = objectMapper.readValue(message, Map.class);
//        log.info("Processing payment success");
//
//        String userEmail = (String) event.get("userEmail");
//        String userName = (String) event.get("userName");
//        Double amount = (Double) event.get("amount");
//
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("userName", userName);
//        templateData.put("amount", amount);
//        templateData.put("paymentId", event.get("paymentId"));
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(userEmail)
//                .subject("Payment Successful!")
//                .emailType(EmailType.PAYMENT_SUCCESS)
//                .templateName("payment-success")
//                .templateData(templateData)
//                .build();
//
//        emailService.sendEmail(emailRequest);
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("Payment success email sent");
//    }
//
//    /**
//     * Handle payment failed event
//     */
//    private void handlePaymentFailed(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        Map<String, Object> event = objectMapper.readValue(message, Map.class);
//        log.info("Processing payment failure");
//
//        String userEmail = (String) event.get("userEmail");
//        String userName = (String) event.get("userName");
//        String reason = (String) event.get("reason");
//
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("userName", userName);
//        templateData.put("reason", reason);
//        templateData.put("paymentId", event.get("paymentId"));
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(userEmail)
//                .subject("Payment Failed")
//                .emailType(EmailType.PAYMENT_FAILED)
//                .templateName("payment-failed")
//                .templateData(templateData)
//                .build();
//
//        emailService.sendEmail(emailRequest);
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("Payment failure email sent");
//    }
//
//    /**
//     * Handle reminder event
//     */
//    private void handleReminder(String message, String correlationId, NotificationEvent notificationEvent) throws Exception {
//        Map<String, Object> event = objectMapper.readValue(message, Map.class);
//        log.info("Processing reminder");
//
//        String userEmail = (String) event.get("userEmail");
//        String userName = (String) event.get("userName");
//        String reminderType = (String) event.get("reminderType");
//
//        Map<String, Object> templateData = new HashMap<>();
//        templateData.put("userName", userName);
//        templateData.put("reminderType", reminderType);
//        templateData.put("reminderDate", event.get("reminderDate"));
//        templateData.put("message", event.get("message"));
//
//        EmailRequestDTO emailRequest = EmailRequestDTO.builder()
//                .to(userEmail)
//                .subject("Reminder: " + reminderType)
//                .emailType(EmailType.REMINDER)
//                .templateName("reminder")
//                .templateData(templateData)
//                .build();
//
//        emailService.sendEmail(emailRequest);
//        notificationService.updateEventStatus(notificationEvent.getId(), NotificationStatus.COMPLETED);
//        log.info("Reminder email sent");
//    }
//
//    /**
//     * Handle dead letter queue messages (failed messages)
//     */
//    @RabbitListener(queues = "${rabbitmq.queue.dead-letter}")
//    public void consumeDeadLetter(String message) {
//        log.error("Received dead letter message: {}", message);
//        // Log to database or alert system
//    }
//}