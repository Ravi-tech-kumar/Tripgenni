package com.major.notification_service.dto;

import com.major.notification_service.model.enums.NotificationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Notification response")
public class NotificationResponseDTO {

    @Schema(description = "Notification ID", example = "notif_12345")
    private String notificationId;

    @Schema(description = "Correlation ID for tracking", example = "corr_67890")
    private String correlationId;

    @Schema(description = "Status of the notification", example = "SENT")
    private NotificationStatus status;

    @Schema(description = "Timestamp when sent", example = "2024-01-01T10:30:00")
    private LocalDateTime sentAt;

    @Schema(description = "Error message if failed", example = "Invalid email address")
    private String errorMessage;

    @Schema(description = "Success message", example = "Email sent successfully")
    private String message;

    @Schema(description = "HTTP Status code", example = "200")
    private Integer statusCode;

    @Schema(description = "Additional details about the notification")
    private Map<String, Object> details;

    @Schema(description = "Recipient email", example = "user@example.com")
    private String recipient;

    @Schema(description = "Email subject", example = "Welcome to TripGennie!")
    private String subject;

    @Schema(description = "Email type", example = "WELCOME")
    private String emailType;

    @Schema(description = "Number of retry attempts", example = "0")
    private Integer retryCount;

    @Schema(description = "Processing time in milliseconds", example = "150")
    private Long processingTimeMs;

    @Schema(description = "Whether the request was successful", example = "true")
    private Boolean success;

    @Schema(description = "API version", example = "v1")
    @Builder.Default
    private String apiVersion = "1.0";

    @Schema(description = "Timestamp of response", example = "2024-01-01T10:30:01")
    private LocalDateTime responseTime;

    // Builder default for success
    public static class NotificationResponseDTOBuilder {
        private Boolean success = true;
        private Integer statusCode = 200;
        private LocalDateTime responseTime = LocalDateTime.now();

        public NotificationResponseDTOBuilder success(Boolean success) {
            this.success = success;
            this.statusCode = success ? 200 : 400;
            return this;
        }
    }

    // Factory methods for common responses
    public static NotificationResponseDTO success(String message, String notificationId) {
        return NotificationResponseDTO.builder()
                .success(true)
                .statusCode(200)
                .status(NotificationStatus.SENT)
                .message(message)
                .notificationId(notificationId)
                .responseTime(LocalDateTime.now())
                .build();
    }

    public static NotificationResponseDTO success(String message, String notificationId, String correlationId) {
        return NotificationResponseDTO.builder()
                .success(true)
                .statusCode(200)
                .status(NotificationStatus.SENT)
                .message(message)
                .notificationId(notificationId)
                .correlationId(correlationId)
                .responseTime(LocalDateTime.now())
                .build();
    }

    public static NotificationResponseDTO pending(String message, String notificationId) {
        return NotificationResponseDTO.builder()
                .success(true)
                .statusCode(202)
                .status(NotificationStatus.PENDING)
                .message(message)
                .notificationId(notificationId)
                .responseTime(LocalDateTime.now())
                .build();
    }

    public static NotificationResponseDTO error(String message, String errorDetails) {
        return NotificationResponseDTO.builder()
                .success(false)
                .statusCode(400)
                .status(NotificationStatus.FAILED)
                .message(message)
                .errorMessage(errorDetails)
                .responseTime(LocalDateTime.now())
                .build();
    }

    public static NotificationResponseDTO error(String message, String errorDetails, int statusCode) {
        return NotificationResponseDTO.builder()
                .success(false)
                .statusCode(statusCode)
                .status(NotificationStatus.FAILED)
                .message(message)
                .errorMessage(errorDetails)
                .responseTime(LocalDateTime.now())
                .build();
    }

    public static NotificationResponseDTO fromEmailLog(com.major.notification_service.model.EmailLog emailLog) {
        return NotificationResponseDTO.builder()
                .success(emailLog.getStatus() == NotificationStatus.SENT)
                .statusCode(emailLog.getStatus() == NotificationStatus.SENT ? 200 : 400)
                .status(emailLog.getStatus())
                .notificationId(emailLog.getMessageId())
                .correlationId(emailLog.getMessageId())
                .sentAt(emailLog.getSentAt())
                .message("Email " + emailLog.getStatus().toString().toLowerCase())
                .errorMessage(emailLog.getErrorMessage())
                .recipient(emailLog.getRecipientEmail())
                .subject(emailLog.getSubject())
                .emailType(emailLog.getEmailType() != null ? emailLog.getEmailType().name() : null)
                .retryCount(emailLog.getRetryCount())
                .responseTime(LocalDateTime.now())
                .build();
    }

    public static NotificationResponseDTO fromEvent(com.major.notification_service.model.NotificationEvent event) {
        return NotificationResponseDTO.builder()
                .success(event.getStatus() == NotificationStatus.COMPLETED)
                .statusCode(event.getStatus() == NotificationStatus.COMPLETED ? 200 : 400)
                .status(event.getStatus())
                .notificationId(event.getCorrelationId())
                .correlationId(event.getCorrelationId())
                .sentAt(event.getCompletedAt())
                .message("Event " + event.getStatus().toString().toLowerCase())
                .errorMessage(event.getErrorMessage())
                .retryCount(event.getRetryCount())
                .responseTime(LocalDateTime.now())
                .build();
    }
}