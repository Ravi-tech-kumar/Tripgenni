package com.major.notification_service.model;

import com.major.notification_service.model.enums.EventType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notification_events",
        indexes = {
                @Index(name = "idx_correlation_id", columnList = "correlation_id", unique = true),
                @Index(name = "idx_event_type", columnList = "event_type"),
                @Index(name = "idx_status", columnList = "status"),
                @Index(name = "idx_created_at", columnList = "created_at"),
                @Index(name = "idx_source_service", columnList = "source_service"),
                @Index(name = "idx_processed_at", columnList = "processed_at")
        })
public class NotificationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "correlation_id", length = 36, nullable = false, unique = true)
    private String correlationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "payload", columnDefinition = "JSON")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private NotificationStatus status;

    @Column(name = "source_service", length = 100)
    private String sourceService;

    @Column(name = "destination_service", length = 100)
    private String destinationService;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 5; // 1-10, 1 being highest

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Version
    @Column(name = "version")
    private Integer version;

    @Transient
    private Map<String, Object> payload;

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @PrePersist
    public void prePersist() {
        if (retryCount == null) {
            retryCount = 0;
        }
        if (priority == null) {
            priority = 5;
        }
        convertMapToJson();
    }

    @PreUpdate
    public void preUpdate() {
        convertMapToJson();
    }

    @PostLoad
    public void postLoad() {
        convertJsonToMap();
    }

    private void convertMapToJson() {
        if (payload != null && payloadJson == null) {
            try {
                this.payloadJson = objectMapper.writeValueAsString(payload);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to convert payload to JSON", e);
            }
        }
    }

    private void convertJsonToMap() {
        if (payloadJson != null && payload == null) {
            try {
                this.payload = objectMapper.readValue(payloadJson,
                        new TypeReference<Map<String, Object>>() {});
            } catch (JsonProcessingException e) {
                // If JSON is invalid, create empty map
                this.payload = new HashMap<>();
            }
        }
    }

    // Helper methods
    public void markAsProcessing() {
        this.status = NotificationStatus.PROCESSING;
        this.processedAt = LocalDateTime.now();
    }

    public void markAsCompleted() {
        this.status = NotificationStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void markAsFailed(String error) {
        this.status = NotificationStatus.FAILED;
        this.errorMessage = error;
    }

    public void incrementRetryCount() {
        this.retryCount = this.retryCount + 1;
        this.status = NotificationStatus.RETRYING;
    }

    public boolean isRetryable() {
        return this.retryCount < 3 &&
                this.status == NotificationStatus.FAILED &&
                (this.expiresAt == null || this.expiresAt.isAfter(LocalDateTime.now()));
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    public long getProcessingTimeInSeconds() {
        if (completedAt != null && createdAt != null) {
            return java.time.Duration.between(createdAt, completedAt).getSeconds();
        }
        if (processedAt != null && createdAt != null) {
            return java.time.Duration.between(createdAt, processedAt).getSeconds();
        }
        return 0;
    }

    public long getTimeInQueueInSeconds() {
        if (processedAt != null && createdAt != null) {
            return java.time.Duration.between(createdAt, processedAt).getSeconds();
        }
        if (createdAt != null) {
            return java.time.Duration.between(createdAt, LocalDateTime.now()).getSeconds();
        }
        return 0;
    }

    public boolean isHighPriority() {
        return priority <= 3;
    }

    public boolean isLowPriority() {
        return priority >= 8;
    }

    // Builder override to handle defaults
    public static class NotificationEventBuilder {
        private Integer retryCount = 0;
        private Integer priority = 5;

        public NotificationEventBuilder retryCount(Integer retryCount) {
            this.retryCount = retryCount != null ? retryCount : 0;
            return this;
        }

        public NotificationEventBuilder priority(Integer priority) {
            this.priority = priority != null ? priority : 5;
            return this;
        }
    }
}


