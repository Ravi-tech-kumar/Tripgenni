package com.major.notification_service.controller;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.NotificationResponseDTO;
import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.service.EmailService;
import com.major.notification_service.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
@Tag(name = "Email Controller", description = "Endpoints for managing emails")
public class EmailController {

    private final EmailService emailService;
    private final NotificationService notificationService;

    @PostMapping("/send")
    @Operation(summary = "Send email", description = "Sends an email to a recipient")
    public ResponseEntity<NotificationResponseDTO> sendEmail(@Valid @RequestBody EmailRequestDTO request) {
        log.info("Received request to send email via email controller to: {}", request.getTo());
        NotificationResponseDTO response = notificationService.sendEmailNotification(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-async")
    @Operation(summary = "Send email asynchronously", description = "Sends an email asynchronously without waiting for result")
    public ResponseEntity<String> sendEmailAsync(@Valid @RequestBody EmailRequestDTO request) {
        log.info("Received async email request to: {}", request.getTo());
        emailService.sendEmailAsync(request);
        return ResponseEntity.accepted().body("Email queued for sending");
    }

    @GetMapping("/logs/user/{userId}")
    @Operation(summary = "Get email logs by user", description = "Retrieves email logs for a specific user")
    public ResponseEntity<List<EmailLog>> getEmailLogsByUser(
            @Parameter(description = "User ID") @PathVariable String userId) {
        log.info("Fetching email logs for user: {}", userId);
        List<EmailLog> logs = emailService.getEmailLogsByUserId(userId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/user/{userId}/paged")
    @Operation(summary = "Get email logs by user with pagination", description = "Retrieves paginated email logs for a user")
    public ResponseEntity<Page<EmailLog>> getEmailLogsByUserPaged(
            @Parameter(description = "User ID") @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        log.info("Fetching paged email logs for user: {}, page: {}, size: {}", userId, page, size);

        Sort sort = sortDirection.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<EmailLog> logs = emailService.getEmailLogsByUserId(userId, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/type/{emailType}")
    @Operation(summary = "Get email logs by type", description = "Retrieves email logs by email type")
    public ResponseEntity<List<EmailLog>> getEmailLogsByType(
            @Parameter(description = "Email type") @PathVariable EmailType emailType) {
        log.info("Fetching email logs by type: {}", emailType);
        List<EmailLog> logs = emailService.getEmailLogsByType(emailType);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/status/{status}")
    @Operation(summary = "Get email logs by status", description = "Retrieves email logs by status")
    public ResponseEntity<List<EmailLog>> getEmailLogsByStatus(
            @Parameter(description = "Status") @PathVariable NotificationStatus status) {
        log.info("Fetching email logs by status: {}", status);
        List<EmailLog> logs = emailService.getEmailLogsByStatus(status);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/date-range")
    @Operation(summary = "Get email logs by date range", description = "Retrieves email logs sent between dates")
    public ResponseEntity<List<EmailLog>> getEmailLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        log.info("Fetching email logs between {} and {}", start, end);
        List<EmailLog> logs = emailService.getEmailLogsByDateRange(start, end);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/{logId}")
    @Operation(summary = "Get email log by ID", description = "Retrieves a specific email log by ID")
    public ResponseEntity<EmailLog> getEmailLogById(
            @Parameter(description = "Log ID") @PathVariable Long logId) {
        log.info("Fetching email log with id: {}", logId);
        EmailLog log = emailService.getEmailLogById(logId);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/logs/message/{messageId}")
    @Operation(summary = "Get email log by message ID", description = "Retrieves a specific email log by message ID")
    public ResponseEntity<EmailLog> getEmailLogByMessageId(
            @Parameter(description = "Message ID") @PathVariable String messageId) {
        log.info("Fetching email log with messageId: {}", messageId);
        EmailLog emailLog = emailService.getEmailLogByMessageId(messageId);
        return ResponseEntity.ok(emailLog);
    }

    // ============= PAGINATION ENDPOINTS FOR USER AND TYPE =============

    @GetMapping("/user/{userId}/type/{emailType}/latest")
    @Operation(summary = "Get latest email by user and type",
            description = "Retrieves the most recent email for a user of specific type")
    public ResponseEntity<EmailLog> getLatestEmailByUserAndType(
            @PathVariable String userId,
            @PathVariable EmailType emailType) {

        log.info("Fetching latest email for user: {} and type: {}", userId, emailType);
        Optional<EmailLog> emailLog = emailService.getLatestEmailByUserAndType(userId, emailType);

        return emailLog.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}/type/{emailType}")
    @Operation(summary = "Get paginated emails by user and type",
            description = "Retrieves paginated emails for a user of specific type")
    public ResponseEntity<Page<EmailLog>> getEmailsByUserAndType(
            @PathVariable String userId,
            @PathVariable EmailType emailType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info("Fetching page {} of emails for user: {} and type: {}", page, userId, emailType);
        Page<EmailLog> emails = emailService.getEmailsByUserAndType(userId, emailType, page, size);
        return ResponseEntity.ok(emails);
    }

    @GetMapping("/user/{userId}/type/{emailType}/more")
    @Operation(summary = "Load more emails",
            description = "Loads more emails for a user by increasing page size")
    public ResponseEntity<Page<EmailLog>> loadMoreEmails(
            @PathVariable String userId,
            @PathVariable EmailType emailType,
            @RequestParam(defaultValue = "20") int newSize) {

        log.info("Loading {} emails for user: {} and type: {}", newSize, userId, emailType);
        Page<EmailLog> emails = emailService.loadMoreEmails(userId, emailType, newSize);
        return ResponseEntity.ok(emails);
    }

    @GetMapping("/user/{userId}/type/{emailType}/native-latest")
    @Operation(summary = "Get latest email by user and type (native query)",
            description = "Retrieves the most recent email using native query")
    public ResponseEntity<EmailLog> getLatestEmailByUserAndTypeNative(
            @PathVariable String userId,
            @PathVariable EmailType emailType) {

        log.info("Fetching latest email (native) for user: {} and type: {}", userId, emailType);
        Optional<EmailLog> emailLog = emailService.getLatestEmailByUserAndTypeNative(userId, emailType);

        return emailLog.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stats")
    @Operation(summary = "Get email statistics", description = "Retrieves statistics about emails")
    public ResponseEntity<Object> getEmailStats() {
        log.info("Fetching email statistics");
        return ResponseEntity.ok(emailService.getEmailStats());
    }

    @PostMapping("/test")
    @Operation(summary = "Send test email", description = "Sends a test email to verify configuration")
    public ResponseEntity<String> sendTestEmail(
            @RequestParam String to,
            @RequestParam(defaultValue = "Test Email") String subject) {
        log.info("Sending test email to: {}", to);

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(to)
                .subject(subject)
                .emailType(EmailType.WELCOME)
                .templateName("welcome-email")
                .build();

        emailService.sendEmailAsync(request);
        return ResponseEntity.ok("Test email sent to " + to);
    }

    @DeleteMapping("/logs/{logId}")
    @Operation(summary = "Delete email log", description = "Deletes an email log by ID")
    public ResponseEntity<Void> deleteEmailLog(
            @Parameter(description = "Log ID") @PathVariable Long logId) {
        log.info("Deleting email log with id: {}", logId);
        emailService.deleteEmailLog(logId);
        return ResponseEntity.noContent().build();
    }
}
/*

package com.major.notification_service.controller;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.NotificationResponseDTO;
import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.service.EmailService;
import com.major.notification_service.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
@Tag(name = "Email Controller", description = "Endpoints for managing emails")
public class EmailController {

    private final EmailService emailService;
    private final NotificationService notificationService;

    @PostMapping("/send")
    @Operation(summary = "Send email", description = "Sends an email to a recipient")
    public ResponseEntity<NotificationResponseDTO> sendEmail(@Valid @RequestBody EmailRequestDTO request) {
        log.info("Received request to send email via email controller to: {}", request.getTo());
        NotificationResponseDTO response = notificationService.sendEmailNotification(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-async")
    @Operation(summary = "Send email asynchronously", description = "Sends an email asynchronously without waiting for result")
    public ResponseEntity<String> sendEmailAsync(@Valid @RequestBody EmailRequestDTO request) {
        log.info("Received async email request to: {}", request.getTo());
        emailService.sendEmailAsync(request);
        return ResponseEntity.accepted().body("Email queued for sending");
    }

    @GetMapping("/logs/user/{userId}")
    @Operation(summary = "Get email logs by user", description = "Retrieves email logs for a specific user")
    public ResponseEntity<List<EmailLog>> getEmailLogsByUser(
            @Parameter(description = "User ID") @PathVariable String userId) {
        log.info("Fetching email logs for user: {}", userId);
        List<EmailLog> logs = emailService.getEmailLogsByUserId(userId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/user/{userId}/paged")
    @Operation(summary = "Get email logs by user with pagination", description = "Retrieves paginated email logs for a user")
    public ResponseEntity<Page<EmailLog>> getEmailLogsByUserPaged(
            @Parameter(description = "User ID") @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        log.info("Fetching paged email logs for user: {}, page: {}, size: {}", userId, page, size);

        Sort sort = sortDirection.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<EmailLog> logs = emailService.getEmailLogsByUserId(userId, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/type/{emailType}")
    @Operation(summary = "Get email logs by type", description = "Retrieves email logs by email type")
    public ResponseEntity<List<EmailLog>> getEmailLogsByType(
            @Parameter(description = "Email type") @PathVariable EmailType emailType) {
        log.info("Fetching email logs by type: {}", emailType);
        List<EmailLog> logs = emailService.getEmailLogsByType(emailType);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/status/{status}")
    @Operation(summary = "Get email logs by status", description = "Retrieves email logs by status")
    public ResponseEntity<List<EmailLog>> getEmailLogsByStatus(
            @Parameter(description = "Status") @PathVariable NotificationStatus status) {
        log.info("Fetching email logs by status: {}", status);
        List<EmailLog> logs = emailService.getEmailLogsByStatus(status);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/date-range")
    @Operation(summary = "Get email logs by date range", description = "Retrieves email logs sent between dates")
    public ResponseEntity<List<EmailLog>> getEmailLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        log.info("Fetching email logs between {} and {}", start, end);
        List<EmailLog> logs = emailService.getEmailLogsByDateRange(start, end);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/{logId}")
    @Operation(summary = "Get email log by ID", description = "Retrieves a specific email log by ID")
    public ResponseEntity<EmailLog> getEmailLogById(
            @Parameter(description = "Log ID") @PathVariable Long logId) {
        log.info("Fetching email log with id: {}", logId);
        EmailLog log = emailService.getEmailLogById(logId);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/logs/message/{messageId}")
    @Operation(summary = "Get email log by message ID", description = "Retrieves a specific email log by message ID")
    public ResponseEntity<EmailLog> getEmailLogByMessageId(
            @Parameter(description = "Message ID") @PathVariable String messageId) {
        log.info("Fetching email log with messageId: {}", messageId);
        EmailLog emailLog = emailService.getEmailLogByMessageId(messageId);
        return ResponseEntity.ok(emailLog);
    }

    // ============= NEW METHODS FOR PAGINATION =============

    @GetMapping("/user/{userId}/type/{emailType}/latest")
    @Operation(summary = "Get latest email by user and type",
            description = "Retrieves the most recent email for a user of specific type - for initial load")
    public ResponseEntity<EmailLog> getLatestEmailByUserAndType(
            @PathVariable String userId,
            @PathVariable EmailType emailType) {

        log.info("Fetching latest email for user: {} and type: {}", userId, emailType);
        Optional<EmailLog> emailLog = emailService.getLatestEmailByUserAndType(userId, emailType);

        return emailLog.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}/type/{emailType}")
    @Operation(summary = "Get paginated emails by user and type",
            description = "Retrieves paginated emails for a user of specific type - for normal pagination")
    public ResponseEntity<Page<EmailLog>> getEmailsByUserAndType(
            @PathVariable String userId,
            @PathVariable EmailType emailType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info("Fetching page {} of emails for user: {} and type: {}", page, userId, emailType);
        Page<EmailLog> emails = emailService.getEmailsByUserAndType(userId, emailType, page, size);
        return ResponseEntity.ok(emails);
    }

    @GetMapping("/user/{userId}/type/{emailType}/more")
    @Operation(summary = "Load more emails",
            description = "Loads more emails for a user (increases page size) - for 'More' button")
    public ResponseEntity<Page<EmailLog>> loadMoreEmails(
            @PathVariable String userId,
            @PathVariable EmailType emailType,
            @RequestParam(defaultValue = "20") int newSize) {

        log.info("Loading {} emails for user: {} and type: {}", newSize, userId, emailType);
        Page<EmailLog> emails = emailService.loadMoreEmails(userId, emailType, newSize);
        return ResponseEntity.ok(emails);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get email statistics", description = "Retrieves statistics about emails")
    public ResponseEntity<Object> getEmailStats() {
        log.info("Fetching email statistics");
        return ResponseEntity.ok(emailService.getEmailStats());
    }

    @PostMapping("/test")
    @Operation(summary = "Send test email", description = "Sends a test email to verify configuration")
    public ResponseEntity<String> sendTestEmail(
            @RequestParam String to,
            @RequestParam(defaultValue = "Test Email") String subject) {
        log.info("Sending test email to: {}", to);

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(to)
                .subject(subject)
                .emailType(EmailType.WELCOME)
                .templateName("welcome-email")
                .build();

        emailService.sendEmailAsync(request);
        return ResponseEntity.ok("Test email sent to " + to);
    }

    @DeleteMapping("/logs/{logId}")
    @Operation(summary = "Delete email log", description = "Deletes an email log by ID")
    public ResponseEntity<Void> deleteEmailLog(
            @Parameter(description = "Log ID") @PathVariable Long logId) {
        log.info("Deleting email log with id: {}", logId);
        emailService.deleteEmailLog(logId);
        return ResponseEntity.noContent().build();
    }
}

 */
/*
package com.major.notification_service.controller;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.NotificationResponseDTO;
import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.service.EmailService;
import com.major.notification_service.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
@Tag(name = "Email Controller", description = "Endpoints for managing emails")
public class EmailController {

    private final EmailService emailService;
    private final NotificationService notificationService;

    @PostMapping("/send")
    @Operation(summary = "Send email", description = "Sends an email to a recipient")
    public ResponseEntity<NotificationResponseDTO> sendEmail(@Valid @RequestBody EmailRequestDTO request) {
        log.info("Received request to send email via email controller to: {}", request.getTo());

        // Use notification service to send email
        NotificationResponseDTO response = notificationService.sendEmailNotification(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-async")
    @Operation(summary = "Send email asynchronously", description = "Sends an email asynchronously without waiting for result")
    public ResponseEntity<String> sendEmailAsync(@Valid @RequestBody EmailRequestDTO request) {
        log.info("Received async email request to: {}", request.getTo());

        // Send email asynchronously
        emailService.sendEmailAsync(request);

        return ResponseEntity.accepted().body("Email queued for sending");
    }

    @GetMapping("/logs/user/{userId}")
    @Operation(summary = "Get email logs by user", description = "Retrieves email logs for a specific user")
    public ResponseEntity<List<EmailLog>> getEmailLogsByUser(
            @Parameter(description = "User ID") @PathVariable String userId) {
        log.info("Fetching email logs for user: {}", userId);
        List<EmailLog> logs = emailService.getEmailLogsByUserId(userId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/user/{userId}/paged")
    @Operation(summary = "Get email logs by user with pagination", description = "Retrieves paginated email logs for a user")
    public ResponseEntity<Page<EmailLog>> getEmailLogsByUserPaged(
            @Parameter(description = "User ID") @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        log.info("Fetching paged email logs for user: {}, page: {}, size: {}", userId, page, size);

        Sort sort = sortDirection.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<EmailLog> logs = emailService.getEmailLogsByUserId(userId, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/type/{emailType}")
    @Operation(summary = "Get email logs by type", description = "Retrieves email logs by email type")
    public ResponseEntity<List<EmailLog>> getEmailLogsByType(
            @Parameter(description = "Email type") @PathVariable EmailType emailType) {
        log.info("Fetching email logs by type: {}", emailType);
        List<EmailLog> logs = emailService.getEmailLogsByType(emailType);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/status/{status}")
    @Operation(summary = "Get email logs by status", description = "Retrieves email logs by status")
    public ResponseEntity<List<EmailLog>> getEmailLogsByStatus(
            @Parameter(description = "Status") @PathVariable NotificationStatus status) {
        log.info("Fetching email logs by status: {}", status);
        List<EmailLog> logs = emailService.getEmailLogsByStatus(status);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/date-range")
    @Operation(summary = "Get email logs by date range", description = "Retrieves email logs sent between dates")
    public ResponseEntity<List<EmailLog>> getEmailLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        log.info("Fetching email logs between {} and {}", start, end);
        List<EmailLog> logs = emailService.getEmailLogsByDateRange(start, end);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/logs/{logId}")
    @Operation(summary = "Get email log by ID", description = "Retrieves a specific email log by ID")
    public ResponseEntity<EmailLog> getEmailLogById(
            @Parameter(description = "Log ID") @PathVariable Long logId) {
        log.info("Fetching email log with id: {}", logId);
        EmailLog log = emailService.getEmailLogById(logId);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/logs/message/{messageId}")
    @Operation(summary = "Get email log by message ID", description = "Retrieves a specific email log by message ID")
    public ResponseEntity<EmailLog> getEmailLogByMessageId(
            @Parameter(description = "Message ID") @PathVariable String messageId) {
        log.info("Fetching email log with messageId: {}", messageId);
        EmailLog emailLog = emailService.getEmailLogByMessageId(messageId);
        return ResponseEntity.ok(emailLog);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get email statistics", description = "Retrieves statistics about emails")
    public ResponseEntity<Object> getEmailStats() {
        log.info("Fetching email statistics");
        return ResponseEntity.ok(emailService.getEmailStats());
    }

    @PostMapping("/test")
    @Operation(summary = "Send test email", description = "Sends a test email to verify configuration")
    public ResponseEntity<String> sendTestEmail(
            @RequestParam String to,
            @RequestParam(defaultValue = "Test Email") String subject) {
        log.info("Sending test email to: {}", to);

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(to)
                .subject(subject)
                .emailType(EmailType.WELCOME)
                .templateName("welcome-email")
                .build();

        emailService.sendEmailAsync(request);

        return ResponseEntity.ok("Test email sent to " + to);
    }

    @DeleteMapping("/logs/{logId}")
    @Operation(summary = "Delete email log", description = "Deletes an email log by ID")
    public ResponseEntity<Void> deleteEmailLog(
            @Parameter(description = "Log ID") @PathVariable Long logId) {
        log.info("Deleting email log with id: {}", logId);
        emailService.deleteEmailLog(logId);
        return ResponseEntity.noContent().build();
    }
}


*/