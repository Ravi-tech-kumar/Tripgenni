package com.major.notification_service.model;

import com.major.notification_service.model.enums.EmailType;
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
@Table(name = "email_logs",
        indexes = {
                @Index(name = "idx_user_id", columnList = "user_id"),
                @Index(name = "idx_status", columnList = "status"),
                @Index(name = "idx_email_type", columnList = "email_type"),
                @Index(name = "idx_recipient_email", columnList = "recipient_email"),
                @Index(name = "idx_created_at", columnList = "created_at"),
                @Index(name = "idx_message_id", columnList = "message_id", unique = true),
                @Index(name = "idx_sent_at", columnList = "sent_at")
        })
public class EmailLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    @Column(name = "sender_email", nullable = false, length = 255)
    private String senderEmail;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_type", nullable = false, length = 50)
    private EmailType emailType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private NotificationStatus status;

    @Column(name = "template_name", length = 255)
    private String templateName;

    @Column(name = "template_data", columnDefinition = "JSON")
    private String templateDataJson;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "message_id", length = 100, unique = true)
    private String messageId;

    @Column(name = "cc", length = 500)
    private String cc;

    @Column(name = "bcc", length = 500)
    private String bcc;

    @Column(name = "attachments", length = 1000)
    private String attachments;

    @Version
    @Column(name = "version")
    private Integer version;

    @Transient
    private Map<String, Object> templateData;

    private static final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    @PrePersist
    public void prePersist() {
        if (retryCount == null) {
            retryCount = 0;
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
        if (templateData != null && templateDataJson == null) {
            try {
                this.templateDataJson = objectMapper.writeValueAsString(templateData);
            } catch (JsonProcessingException e) {
                throw new RuntimeException("Failed to convert template data to JSON", e);
            }
        }
    }

    private void convertJsonToMap() {
        if (templateDataJson != null && templateData == null) {
            try {
                this.templateData = objectMapper.readValue(templateDataJson,
                        new TypeReference<Map<String, Object>>() {});
            } catch (JsonProcessingException e) {
                // If JSON is invalid, create empty map
                this.templateData = new HashMap<>();
            }
        }
    }

    // Helper methods
    public void markAsSent() {
        this.status = NotificationStatus.SENT;
        this.sentAt = LocalDateTime.now();
    }

    public void markAsDelivered() {
        this.status = NotificationStatus.DELIVERED;
        this.deliveredAt = LocalDateTime.now();
    }

    public void markAsOpened() {
        this.status = NotificationStatus.OPENED;
        this.openedAt = LocalDateTime.now();
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
                (this.status == NotificationStatus.FAILED ||
                        this.status == NotificationStatus.PENDING);
    }

    public long getProcessingTimeInSeconds() {
        if (sentAt != null && createdAt != null) {
            return java.time.Duration.between(createdAt, sentAt).getSeconds();
        }
        return 0;
    }
}