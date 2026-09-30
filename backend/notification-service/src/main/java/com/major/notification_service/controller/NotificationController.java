package com.major.notification_service.controller;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.NotificationResponseDTO;
import com.major.notification_service.model.NotificationEvent;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.service.NotificationService;
import com.major.notification_service.service.RabbitMQProducerService;
import com.major.notification_service.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification Controller", description = "Endpoints for managing notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final EmailService emailService;
    private final RabbitMQProducerService rabbitMQProducerService;

    @Value("${rabbitmq.enabled:true}")
    private boolean rabbitMQEnabled;

    @PostMapping("/email")
    @Operation(summary = "Send email notification", description = "Sends an email notification to a user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Email sent successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    public ResponseEntity<NotificationResponseDTO> sendEmail(@Valid @RequestBody EmailRequestDTO request) {
        String correlationId = UUID.randomUUID().toString();
        log.info("📧 Received email request for: {} (Correlation ID: {})", request.getTo(), correlationId);

        try {
            boolean rabbitMQAvailable = isRabbitMQAvailable();

            if (rabbitMQAvailable) {
                log.info("🐇 RabbitMQ is available, sending via queue");
                rabbitMQProducerService.sendEmailNotification(request);

                return ResponseEntity.ok(NotificationResponseDTO.builder()
                        .correlationId(correlationId)
                        .status(NotificationStatus.PENDING)
                        .sentAt(LocalDateTime.now())
                        .message("Email queued for delivery via RabbitMQ")
                        .build());
            } else {
                log.info("📧 RabbitMQ not available, sending email directly");
                emailService.sendEmail(request);

                // Save to database for tracking
                NotificationEvent event = new NotificationEvent();
                event.setCorrelationId(correlationId);
                event.setRecipientEmail(request.getTo());
                event.setSubject(request.getSubject());
                event.setBody(request.getBody());
                event.setStatus(NotificationStatus.SENT);
                event.setCreatedAt(LocalDateTime.now());
                notificationService.saveEvent(event);

                return ResponseEntity.ok(NotificationResponseDTO.builder()
                        .correlationId(correlationId)
                        .status(NotificationStatus.SENT)
                        .sentAt(LocalDateTime.now())
                        .message("Email sent successfully (direct)")
                        .build());
            }

        } catch (Exception e) {
            log.error("❌ Failed to process email: {}", e.getMessage());

            // Fallback: Try direct email if RabbitMQ failed
            if (isRabbitMQAvailable()) {
                log.info("🔄 RabbitMQ failed, trying direct email as fallback");
                try {
                    emailService.sendEmail(request);
                    return ResponseEntity.ok(NotificationResponseDTO.builder()
                            .correlationId(correlationId)
                            .status(NotificationStatus.SENT)
                            .sentAt(LocalDateTime.now())
                            .message("Email sent successfully (fallback to direct)")
                            .build());
                } catch (Exception fallbackError) {
                    log.error("❌ Fallback email also failed: {}", fallbackError.getMessage());
                }
            }

            return ResponseEntity.status(500).body(NotificationResponseDTO.builder()
                    .correlationId(correlationId)
                    .status(NotificationStatus.FAILED)
                    .errorMessage(e.getMessage())
                    .message("Failed to send email")
                    .build());
        }
    }

    @PostMapping("/test")
    @Operation(summary = "Test email", description = "Send a test email to verify configuration")
    public ResponseEntity<String> sendTestEmail(@RequestParam String to) {
        log.info("🧪 Sending test email to: {}", to);

        Map<String, Object> variables = new HashMap<>();
        variables.put("name", "Traveler");
        variables.put("email", to);
        variables.put("currentYear", LocalDateTime.now().getYear());

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(to)
                .subject("Test Email from TripGenni")
                .body("This is a test email to verify notification service is working correctly.")
                .templateName("welcome")
                .variables(variables)
                .build();

        try {
            boolean rabbitMQAvailable = isRabbitMQAvailable();
            String mode = rabbitMQAvailable ? "RabbitMQ Queue" : "Direct Email";

            if (rabbitMQAvailable) {
                rabbitMQProducerService.sendEmailNotification(request);
            } else {
                emailService.sendEmail(request);
            }

            return ResponseEntity.ok("✅ Test email sent to " + to + " via " + mode);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("❌ Failed to send test email: " + e.getMessage());
        }
    }

    @GetMapping("/status")
    @Operation(summary = "Get service status", description = "Check if RabbitMQ is available and which mode is active")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("service", "Notification Service");
        status.put("timestamp", LocalDateTime.now());

        boolean rabbitMQAvailable = isRabbitMQAvailable();
        status.put("rabbitmq_available", rabbitMQAvailable);
        status.put("rabbitmq_enabled", rabbitMQEnabled);
        status.put("active_mode", rabbitMQAvailable ? "RabbitMQ Queue" : "Direct Email");

        if (rabbitMQAvailable) {
            status.put("message", "✅ RabbitMQ is connected - using queue-based email delivery");
        } else {
            status.put("message", "⚠️ RabbitMQ not available - using direct email delivery");
        }

        return ResponseEntity.ok(status);
    }

    private boolean isRabbitMQAvailable() {
        if (!rabbitMQEnabled) return false;

        try {
            // Check if RabbitMQ is actually running
            rabbitMQProducerService.checkConnection();
            return true;
        } catch (Exception e) {
            log.debug("RabbitMQ connection check failed: {}", e.getMessage());
            return false;
        }
    }

    @GetMapping("/events")
    @Operation(summary = "Get events by status", description = "Retrieves notification events by their status")
    public ResponseEntity<List<NotificationEvent>> getEventsByStatus(
            @Parameter(description = "Status of events to retrieve")
            @RequestParam(required = false) NotificationStatus status) {
        log.info("Fetching events with status: {}", status);
        if (status != null) {
            return ResponseEntity.ok(notificationService.getEventsByStatus(status));
        }
        return ResponseEntity.ok(notificationService.getAllEvents());
    }

    @GetMapping("/events/paged")
    @Operation(summary = "Get events by status with pagination", description = "Retrieves paginated notification events by status")
    public ResponseEntity<Page<NotificationEvent>> getEventsByStatusPaged(
            @Parameter(description = "Status of events to retrieve")
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        log.info("Fetching paged events with status: {}, page: {}, size: {}", status, page, size);

        Sort sort = sortDirection.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<NotificationEvent> events = status != null
                ? notificationService.getEventsByStatus(status, pageable)
                : notificationService.getAllEvents(pageable);

        return ResponseEntity.ok(events);
    }

    @GetMapping("/events/{eventId}")
    @Operation(summary = "Get event by ID", description = "Retrieves a specific notification event by its ID")
    public ResponseEntity<NotificationEvent> getEventById(
            @Parameter(description = "Event ID") @PathVariable Long eventId) {
        log.info("Fetching event with id: {}", eventId);
        NotificationEvent event = notificationService.getEventById(eventId);
        return ResponseEntity.ok(event);
    }

    @GetMapping("/events/correlation/{correlationId}")
    @Operation(summary = "Get event by correlation ID", description = "Retrieves a specific notification event by its correlation ID")
    public ResponseEntity<NotificationEvent> getEventByCorrelationId(
            @Parameter(description = "Correlation ID") @PathVariable String correlationId) {
        log.info("Fetching event with correlationId: {}", correlationId);
        NotificationEvent event = notificationService.getEventByCorrelationId(correlationId);
        return ResponseEntity.ok(event);
    }

    @PutMapping("/events/{eventId}/status")
    @Operation(summary = "Update event status", description = "Updates the status of a notification event")
    public ResponseEntity<NotificationEvent> updateEventStatus(
            @Parameter(description = "Event ID") @PathVariable Long eventId,
            @Parameter(description = "New status") @RequestParam NotificationStatus status) {
        log.info("Updating event {} status to: {}", eventId, status);
        NotificationEvent updatedEvent = notificationService.updateEventStatus(eventId, status);
        return ResponseEntity.ok(updatedEvent);
    }

    @GetMapping("/events/pending/retry")
    @Operation(summary = "Get pending events for retry", description = "Retrieves pending events that need to be retried")
    public ResponseEntity<List<NotificationEvent>> getPendingEventsForRetry() {
        log.info("Fetching pending events for retry");
        List<NotificationEvent> events = notificationService.getPendingEventsForRetry();
        return ResponseEntity.ok(events);
    }

    @DeleteMapping("/events/{eventId}")
    @Operation(summary = "Delete event", description = "Deletes a notification event by ID")
    public ResponseEntity<Void> deleteEvent(
            @Parameter(description = "Event ID") @PathVariable Long eventId) {
        log.info("Deleting event with id: {}", eventId);
        notificationService.deleteEvent(eventId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    @Operation(summary = "Get notification statistics", description = "Retrieves statistics about notifications")
    public ResponseEntity<Object> getNotificationStats() {
        log.info("Fetching notification statistics");
        return ResponseEntity.ok(notificationService.getNotificationStats());
    }

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Check if notification service is running")
    public ResponseEntity<String> health() {
        log.info("🏥 Health check called");
        boolean rabbitMQAvailable = isRabbitMQAvailable();
        String mode = rabbitMQAvailable ? "with RabbitMQ" : "without RabbitMQ (direct email)";
        return ResponseEntity.ok("Notification Service is running " + mode);
    }
}