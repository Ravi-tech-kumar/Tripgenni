package com.major.notification_service.dto;

import com.major.notification_service.model.enums.EmailType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.cfg.context.GroupConversionTargetContext;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Email request payload")
public class EmailRequestDTO {

    // Recipient email address
    @Schema(description = "Recipient email address", example = "user@example.com", required = true)
    @NotBlank(message = "Recipient email is required")
    @Email(message = "Invalid email format")
    private String to;

    // CC recipients
    @Schema(description = "CC recipients", example = "[\"cc1@example.com\", \"cc2@example.com\"]")
    private List<@Email(message = "Invalid CC email format") String> cc;

    // BCC recipients
    @Schema(description = "BCC recipients", example = "[\"bcc1@example.com\", \"bcc2@example.com\"]")
    private List<@Email(message = "Invalid BCC email format") String> bcc;

    // Email subject
    @Schema(description = "Email subject", example = "Welcome to TripGennie!", required = true)
    @NotBlank(message = "Subject is required")
    private String subject;

    // Type of email
    @Schema(description = "Type of email", example = "WELCOME", required = true)
    @NotNull(message = "Email type is required")
    private EmailType emailType;

    // Template name to use
    @Schema(description = "Template name to use", example = "welcome-email")
    private String templateName;

    // Template variables for dynamic content
    @Schema(description = "Template variables for dynamic content")
    private Map<String, Object> templateData;

    // User ID
    @Schema(description = "User ID", example = "123e4567-e89b-12d3-a456-426614174000")
    private String userId;

    // Reply-to email address
    @Schema(description = "Reply-to email address", example = "support@tripgennie.com")
    @Email(message = "Invalid reply-to email format")
    private String replyTo;

    // Attachments URLs
    @Schema(description = "Attachments URLs", example = "[\"https://storage.example.com/doc1.pdf\"]")
    private List<String> attachments;

    // Priority (1-10, 1 being highest)
    @Schema(description = "Priority (1-10, 1 being highest)", example = "5")
    @Builder.Default
    private Integer priority = 5;

    // Schedule send time
    @Schema(description = "Schedule send time", example = "2024-01-01T10:00:00")
    private String scheduleTime;

    // Request source service
    @Schema(description = "Request source service", example = "auth-service")
    private String sourceService;

    // Whether to track opens
    @Schema(description = "Whether to track opens", example = "true")
    @Builder.Default
    private Boolean trackOpens = true;

    // Whether to track clicks
    @Schema(description = "Whether to track clicks", example = "true")
    @Builder.Default
    private Boolean trackClicks = true;


}