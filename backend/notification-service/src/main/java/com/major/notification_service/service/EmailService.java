package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.repository.EmailLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;
    private final TemplateService templateService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name}")
    private String appName;

    // Send email asynchronously
    @Async("emailTaskExecutor")
    @Transactional
    public void sendEmailAsync(EmailRequestDTO request) {
        log.info("Async sending email to: {}", request.getTo());
        try {
            sendEmail(request);
            log.info("Async email sent successfully to: {}", request.getTo());
        } catch (Exception e) {
            log.error("Async email failed to: {} - {}", request.getTo(), e.getMessage());
        }
    }

    // Send email synchronously
    @Transactional
    public void sendEmail(EmailRequestDTO request) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Sending email [{}] to: {}, type: {}", correlationId, request.getTo(), request.getEmailType());

        EmailLog emailLog = createEmailLog(request, correlationId);

        try {
            String content = prepareEmailContent(request);
            MimeMessage message = createMimeMessage(request, content);
            mailSender.send(message);

            updateEmailLogSuccess(emailLog);
            log.info("Email [{}] sent successfully to: {}", correlationId, request.getTo());

        } catch (Exception e) {
            log.error("Failed to send email [{}] to {}: {}", correlationId, request.getTo(), e.getMessage());
            updateEmailLogFailure(emailLog, e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    // Create MimeMessage from request
    private MimeMessage createMimeMessage(EmailRequestDTO request, String content) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(request.getTo());
        helper.setSubject(request.getSubject());
        helper.setText(content, true);

        if (request.getCc() != null && !request.getCc().isEmpty()) {
            helper.setCc(request.getCc().toArray(new String[0]));
        }

        if (request.getBcc() != null && !request.getBcc().isEmpty()) {
            helper.setBcc(request.getBcc().toArray(new String[0]));
        }

        return message;
    }

    // Prepare email content using template
    private String prepareEmailContent(EmailRequestDTO request) {
        String templateName = request.getTemplateName() != null
                ? request.getTemplateName()
                : templateService.getTemplatePath(request.getEmailType());

        Map<String, Object> variables = request.getTemplateData() != null
                ? new HashMap<>(request.getTemplateData())
                : new HashMap<>();

        variables = templateService.enrichTemplateData(variables, request.getEmailType());

        return templateService.processTemplate(templateName, variables);
    }

    // Create email log entry
    private EmailLog createEmailLog(EmailRequestDTO request, String correlationId) {
        EmailLog emailLog = EmailLog.builder()
                .userId(request.getUserId())
                .recipientEmail(request.getTo())
                .senderEmail(fromEmail)
                .subject(request.getSubject())
                .emailType(request.getEmailType())
                .status(NotificationStatus.PENDING)
                .templateName(request.getTemplateName())
                .templateData(request.getTemplateData())
                .retryCount(0)
                .messageId(correlationId)
                .cc(request.getCc() != null ? String.join(",", request.getCc()) : null)
                .bcc(request.getBcc() != null ? String.join(",", request.getBcc()) : null)
                .build();

        return emailLogRepository.save(emailLog);
    }

    // Update email log on success
    private void updateEmailLogSuccess(EmailLog emailLog) {
        emailLog.setStatus(NotificationStatus.SENT);
        emailLog.setSentAt(LocalDateTime.now());
        emailLogRepository.save(emailLog);
    }

    // Update email log on failure
    private void updateEmailLogFailure(EmailLog emailLog, String errorMessage) {
        emailLog.setStatus(NotificationStatus.FAILED);
        emailLog.setErrorMessage(errorMessage);
        emailLog.setRetryCount(emailLog.getRetryCount() + 1);
        emailLogRepository.save(emailLog);
    }

    // Retry failed email
    @Transactional
    public void retryFailedEmail(Long logId) {
        EmailLog emailLog = emailLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + logId));

        if (emailLog.getRetryCount() >= 3) {
            throw new RuntimeException("Maximum retry attempts reached for email: " + logId);
        }

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(emailLog.getRecipientEmail())
                .subject(emailLog.getSubject())
                .emailType(emailLog.getEmailType())
                .templateName(emailLog.getTemplateName())
                .templateData(emailLog.getTemplateData())
                .userId(emailLog.getUserId())
                .build();

        sendEmail(request);
    }

    // ============= QUERY METHODS =============

    public List<EmailLog> getEmailLogsByUserId(String userId) {
        return emailLogRepository.findByUserId(userId);
    }

    public Page<EmailLog> getEmailLogsByUserId(String userId, Pageable pageable) {
        return emailLogRepository.findByUserId(userId, pageable);
    }

    public List<EmailLog> getEmailLogsByType(EmailType emailType) {
        return emailLogRepository.findByEmailType(emailType);
    }

    public List<EmailLog> getEmailLogsByStatus(NotificationStatus status) {
        return emailLogRepository.findByStatus(status);
    }

    public List<EmailLog> getEmailLogsByDateRange(LocalDateTime start, LocalDateTime end) {
        return emailLogRepository.findEmailsSentBetween(start, end);
    }

    public EmailLog getEmailLogById(Long id) {
        return emailLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + id));
    }

    public EmailLog getEmailLogByMessageId(String messageId) {
        return emailLogRepository.findByMessageId(messageId)
                .orElseThrow(() -> new RuntimeException("Email log not found with messageId: " + messageId));
    }

    // ============= PAGINATION METHODS FOR USER AND TYPE =============

    // Method 1: Sirf latest email lao (initial load ke liye)
    public Optional<EmailLog> getLatestEmailByUserAndType(String userId, EmailType emailType) {
        Pageable pageable = PageRequest.of(0, 1, Sort.by("createdAt").descending());
        Page<EmailLog> page = emailLogRepository.findByUserIdAndEmailTypeOrderByCreatedAtDesc(userId, emailType, pageable);
        return page.getContent().isEmpty() ? Optional.empty() : Optional.of(page.getContent().get(0));
    }

    // Method 2: Paginated emails lao (specific page ke liye)
    public Page<EmailLog> getEmailsByUserAndType(String userId, EmailType emailType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return emailLogRepository.findByUserIdAndEmailTypeOrderByCreatedAtDesc(userId, emailType, pageable);
    }

    // Method 3: More emails lao (size badha kar)
    public Page<EmailLog> loadMoreEmails(String userId, EmailType emailType, int newSize) {
        Pageable pageable = PageRequest.of(0, newSize, Sort.by("createdAt").descending());
        return emailLogRepository.findByUserIdAndEmailTypeOrderByCreatedAtDesc(userId, emailType, pageable);
    }

    // Method 4: Native query se latest email lao (alternative)
    public Optional<EmailLog> getLatestEmailByUserAndTypeNative(String userId, EmailType emailType) {
        return emailLogRepository.findTopByUserAndType(userId, emailType.name());
    }

    // Get email statistics
    public Map<String, Object> getEmailStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalEmails", emailLogRepository.count());
        stats.put("sentEmails", emailLogRepository.countByStatus(NotificationStatus.SENT));
        stats.put("failedEmails", emailLogRepository.countByStatus(NotificationStatus.FAILED));
        stats.put("pendingEmails", emailLogRepository.countByStatus(NotificationStatus.PENDING));
        stats.put("emailsSentToday", emailLogRepository.countEmailsSentToday());

        List<Object[]> typeCounts = emailLogRepository.countByEmailTypeGrouped();
        Map<String, Long> emailsByType = new HashMap<>();
        for (Object[] typeCount : typeCounts) {
            EmailType type = (EmailType) typeCount[0];
            Long count = (Long) typeCount[1];
            emailsByType.put(type.name(), count);
        }
        stats.put("emailsByType", emailsByType);

        List<Object[]> statusCounts = emailLogRepository.countByStatusGrouped();
        Map<String, Long> emailsByStatus = new HashMap<>();
        for (Object[] statusCount : statusCounts) {
            NotificationStatus status = (NotificationStatus) statusCount[0];
            Long count = (Long) statusCount[1];
            emailsByStatus.put(status.name(), count);
        }
        stats.put("emailsByStatus", emailsByStatus);

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime today = LocalDateTime.now();

        stats.put("emailsLast7Days", emailLogRepository.countByStatusAndDateRange(
                NotificationStatus.SENT, weekAgo, today));

        stats.put("failedLast7Days", emailLogRepository.countByStatusAndDateRange(
                NotificationStatus.FAILED, weekAgo, today));

        return stats;
    }

    @Transactional
    public void deleteEmailLog(Long id) {
        if (!emailLogRepository.existsById(id)) {
            throw new RuntimeException("Email log not found with id: " + id);
        }
        emailLogRepository.deleteById(id);
    }


}
/*
package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.repository.EmailLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;
    private final TemplateService templateService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name}")
    private String appName;

    // Send email asynchronously
    @Async("emailTaskExecutor")
    @Transactional
    public void sendEmailAsync(EmailRequestDTO request) {
        sendEmail(request);
    }

    // Send email synchronously
    @Transactional
    public void sendEmail(EmailRequestDTO request) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Sending email [{}] to: {}, type: {}", correlationId, request.getTo(), request.getEmailType());

        EmailLog emailLog = createEmailLog(request, correlationId);

        try {
            String content = prepareEmailContent(request);
            MimeMessage message = createMimeMessage(request, content);
            mailSender.send(message);

            updateEmailLogSuccess(emailLog);
            log.info("Email [{}] sent successfully to: {}", correlationId, request.getTo());

        } catch (Exception e) {
            log.error("Failed to send email [{}] to {}: {}", correlationId, request.getTo(), e.getMessage());
            updateEmailLogFailure(emailLog, e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    // Create MimeMessage from request
    private MimeMessage createMimeMessage(EmailRequestDTO request, String content) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(request.getTo());
        helper.setSubject(request.getSubject());
        helper.setText(content, true);

        // Add CC if present
        if (request.getCc() != null && !request.getCc().isEmpty()) {
            helper.setCc(request.getCc().toArray(new String[0]));
        }

        // Add BCC if present
        if (request.getBcc() != null && !request.getBcc().isEmpty()) {
            helper.setBcc(request.getBcc().toArray(new String[0]));
        }

        return message;
    }

    // Prepare email content using template
    private String prepareEmailContent(EmailRequestDTO request) {
        String templateName = request.getTemplateName() != null
                ? request.getTemplateName()
                : templateService.getTemplatePath(request.getEmailType());

        Map<String, Object> variables = request.getTemplateData() != null
                ? new HashMap<>(request.getTemplateData())
                : new HashMap<>();

        variables = templateService.enrichTemplateData(variables, request.getEmailType());

        return templateService.processTemplate(templateName, variables);
    }

    // Create email log entry
    private EmailLog createEmailLog(EmailRequestDTO request, String correlationId) {
        EmailLog emailLog = EmailLog.builder()
                .userId(request.getUserId())
                .recipientEmail(request.getTo())
                .senderEmail(fromEmail)
                .subject(request.getSubject())
                .emailType(request.getEmailType())
                .status(NotificationStatus.PENDING)
                .templateName(request.getTemplateName())
                .templateData(request.getTemplateData())
                .retryCount(0)
                .messageId(correlationId)
                .cc(request.getCc() != null ? String.join(",", request.getCc()) : null)
                .bcc(request.getBcc() != null ? String.join(",", request.getBcc()) : null)
                .build();

        return emailLogRepository.save(emailLog);
    }

    // Update email log on success
    private void updateEmailLogSuccess(EmailLog emailLog) {
        emailLog.setStatus(NotificationStatus.SENT);
        emailLog.setSentAt(LocalDateTime.now());
        emailLogRepository.save(emailLog);
    }

    // Update email log on failure
    private void updateEmailLogFailure(EmailLog emailLog, String errorMessage) {
        emailLog.setStatus(NotificationStatus.FAILED);
        emailLog.setErrorMessage(errorMessage);
        emailLog.setRetryCount(emailLog.getRetryCount() + 1);
        emailLogRepository.save(emailLog);
    }

    // Retry failed email
    @Transactional
    public void retryFailedEmail(Long logId) {
        EmailLog emailLog = emailLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + logId));

        if (emailLog.getRetryCount() >= 3) {
            throw new RuntimeException("Maximum retry attempts reached for email: " + logId);
        }

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(emailLog.getRecipientEmail())
                .subject(emailLog.getSubject())
                .emailType(emailLog.getEmailType())
                .templateName(emailLog.getTemplateName())
                .templateData(emailLog.getTemplateData())
                .userId(emailLog.getUserId())
                .build();

        sendEmail(request);
    }

    // ============= QUERY METHODS =============

    // Get email logs by user ID
    public List<EmailLog> getEmailLogsByUserId(String userId) {
        return emailLogRepository.findByUserId(userId);
    }

    // Get email logs by user ID with pagination
    public Page<EmailLog> getEmailLogsByUserId(String userId, Pageable pageable) {
        return emailLogRepository.findByUserId(userId, pageable);
    }

    // Get email logs by email type
    public List<EmailLog> getEmailLogsByType(EmailType emailType) {
        return emailLogRepository.findByEmailType(emailType);
    }

    // Get email logs by status
    public List<EmailLog> getEmailLogsByStatus(NotificationStatus status) {
        return emailLogRepository.findByStatus(status);
    }

    // Get email logs by date range
    public List<EmailLog> getEmailLogsByDateRange(LocalDateTime start, LocalDateTime end) {
        return emailLogRepository.findEmailsSentBetween(start, end);
    }

    // Get email log by ID
    public EmailLog getEmailLogById(Long id) {
        return emailLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + id));
    }

    // Get email log by message ID
    public EmailLog getEmailLogByMessageId(String messageId) {
        return emailLogRepository.findByMessageId(messageId)
                .orElseThrow(() -> new RuntimeException("Email log not found with messageId: " + messageId));
    }

    // ============= NEW METHODS FOR PAGINATION =============

    // Get latest email for user and type (for initial load - just 1)
    public Optional<EmailLog> getLatestEmailByUserAndType(String userId, EmailType emailType) {
        Pageable pageable = PageRequest.of(0, 1);
        Page<EmailLog> page = emailLogRepository.findByUserIdAndEmailTypeOrderByCreatedAtDesc(userId, emailType, pageable);
        return page.getContent().isEmpty() ? Optional.empty() : Optional.of(page.getContent().get(0));
    }

    // Get paginated emails by user and type (for "More" button)
    public Page<EmailLog> getEmailsByUserAndType(String userId, EmailType emailType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return emailLogRepository.findByUserIdAndEmailTypeOrderByCreatedAtDesc(userId, emailType, pageable);
    }

    // Load more emails (increase page size)
    public Page<EmailLog> loadMoreEmails(String userId, EmailType emailType, int newSize) {
        Pageable pageable = PageRequest.of(0, newSize);
        return emailLogRepository.findByUserIdAndEmailTypeOrderByCreatedAtDesc(userId, emailType, pageable);
    }

    // Get email statistics
    public Map<String, Object> getEmailStats() {
        Map<String, Object> stats = new HashMap<>();

        // Basic counts
        stats.put("totalEmails", emailLogRepository.count());
        stats.put("sentEmails", emailLogRepository.countByStatus(NotificationStatus.SENT));
        stats.put("failedEmails", emailLogRepository.countByStatus(NotificationStatus.FAILED));
        stats.put("pendingEmails", emailLogRepository.countByStatus(NotificationStatus.PENDING));

        // Emails sent today
        stats.put("emailsSentToday", emailLogRepository.countEmailsSentToday());

        // Get counts by email type using grouped query
        List<Object[]> typeCounts = emailLogRepository.countByEmailTypeGrouped();
        Map<String, Long> emailsByType = new HashMap<>();
        for (Object[] typeCount : typeCounts) {
            EmailType type = (EmailType) typeCount[0];
            Long count = (Long) typeCount[1];
            emailsByType.put(type.name(), count);
        }
        stats.put("emailsByType", emailsByType);

        // Counts by status using grouped query
        List<Object[]> statusCounts = emailLogRepository.countByStatusGrouped();
        Map<String, Long> emailsByStatus = new HashMap<>();
        for (Object[] statusCount : statusCounts) {
            NotificationStatus status = (NotificationStatus) statusCount[0];
            Long count = (Long) statusCount[1];
            emailsByStatus.put(status.name(), count);
        }
        stats.put("emailsByStatus", emailsByStatus);

        // Date range stats (last 7 days)
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime today = LocalDateTime.now();

        stats.put("emailsLast7Days", emailLogRepository.countByStatusAndDateRange(
                NotificationStatus.SENT, weekAgo, today));

        stats.put("failedLast7Days", emailLogRepository.countByStatusAndDateRange(
                NotificationStatus.FAILED, weekAgo, today));

        return stats;
    }

    // Delete email log by ID
    @Transactional
    public void deleteEmailLog(Long id) {
        if (!emailLogRepository.existsById(id)) {
            throw new RuntimeException("Email log not found with id: " + id);
        }
        emailLogRepository.deleteById(id);
    }
}


*/
/*

package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.repository.EmailLogRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailLogRepository emailLogRepository;
    private final TemplateService templateService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name}")
    private String appName;

    // Send email asynchronously
    @Async("emailTaskExecutor")
    @Transactional
    public void sendEmailAsync(EmailRequestDTO request) {
        sendEmail(request);
    }

    // Send email synchronously
    @Transactional
    public void sendEmail(EmailRequestDTO request) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Sending email [{}] to: {}, type: {}", correlationId, request.getTo(), request.getEmailType());

        EmailLog emailLog = createEmailLog(request, correlationId);

        try {
            String content = prepareEmailContent(request);
            MimeMessage message = createMimeMessage(request, content);
            mailSender.send(message);

            updateEmailLogSuccess(emailLog);
            log.info("Email [{}] sent successfully to: {}", correlationId, request.getTo());

        } catch (Exception e) {
            log.error("Failed to send email [{}] to {}: {}", correlationId, request.getTo(), e.getMessage());
            updateEmailLogFailure(emailLog, e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    // Create MimeMessage from request
    private MimeMessage createMimeMessage(EmailRequestDTO request, String content) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(request.getTo());
        helper.setSubject(request.getSubject());
        helper.setText(content, true);

        // Add CC if present
        if (request.getCc() != null && !request.getCc().isEmpty()) {
            helper.setCc(request.getCc().toArray(new String[0]));
        }

        // Add BCC if present
        if (request.getBcc() != null && !request.getBcc().isEmpty()) {
            helper.setBcc(request.getBcc().toArray(new String[0]));
        }

        return message;
    }

    // Prepare email content using template
    private String prepareEmailContent(EmailRequestDTO request) {
        String templateName = request.getTemplateName() != null
                ? request.getTemplateName()
                : templateService.getTemplatePath(request.getEmailType());

        Map<String, Object> variables = request.getTemplateData() != null
                ? new HashMap<>(request.getTemplateData())
                : new HashMap<>();

        variables = templateService.enrichTemplateData(variables, request.getEmailType());

        return templateService.processTemplate(templateName, variables);
    }

    // Create email log entry
    private EmailLog createEmailLog(EmailRequestDTO request, String correlationId) {
        EmailLog emailLog = EmailLog.builder()
                .userId(request.getUserId())
                .recipientEmail(request.getTo())
                .senderEmail(fromEmail)
                .subject(request.getSubject())
                .emailType(request.getEmailType())
                .status(NotificationStatus.PENDING)
                .templateName(request.getTemplateName())
                .templateData(request.getTemplateData())
                .retryCount(0)
                .messageId(correlationId)
                .cc(request.getCc() != null ? String.join(",", request.getCc()) : null)
                .bcc(request.getBcc() != null ? String.join(",", request.getBcc()) : null)
                .build();

        return emailLogRepository.save(emailLog);
    }

    // Update email log on success
    private void updateEmailLogSuccess(EmailLog emailLog) {
        emailLog.setStatus(NotificationStatus.SENT);
        emailLog.setSentAt(LocalDateTime.now());
        emailLogRepository.save(emailLog);
    }

    // Update email log on failure
    private void updateEmailLogFailure(EmailLog emailLog, String errorMessage) {
        emailLog.setStatus(NotificationStatus.FAILED);
        emailLog.setErrorMessage(errorMessage);
        emailLog.setRetryCount(emailLog.getRetryCount() + 1);
        emailLogRepository.save(emailLog);
    }

    // Retry failed email
    @Transactional
    public void retryFailedEmail(Long logId) {
        EmailLog emailLog = emailLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + logId));

        if (emailLog.getRetryCount() >= 3) {
            throw new RuntimeException("Maximum retry attempts reached for email: " + logId);
        }

        EmailRequestDTO request = EmailRequestDTO.builder()
                .to(emailLog.getRecipientEmail())
                .subject(emailLog.getSubject())
                .emailType(emailLog.getEmailType())
                .templateName(emailLog.getTemplateName())
                .templateData(emailLog.getTemplateData())
                .userId(emailLog.getUserId())
                .build();

        sendEmail(request);
    }

    // ============= QUERY METHODS =============

    // Get email logs by user ID
    public List<EmailLog> getEmailLogsByUserId(String userId) {
        return emailLogRepository.findByUserId(userId);
    }

    // Get email logs by user ID with pagination
    public Page<EmailLog> getEmailLogsByUserId(String userId, Pageable pageable) {
        return emailLogRepository.findByUserId(userId, pageable);
    }

    // Get email logs by email type
    public List<EmailLog> getEmailLogsByType(EmailType emailType) {
        return emailLogRepository.findByEmailType(emailType);
    }

    // Get email logs by status
    public List<EmailLog> getEmailLogsByStatus(NotificationStatus status) {
        return emailLogRepository.findByStatus(status);
    }

    // Get email logs by date range
    public List<EmailLog> getEmailLogsByDateRange(LocalDateTime start, LocalDateTime end) {
        return emailLogRepository.findEmailsSentBetween(start, end);
    }

    // Get email log by ID
    public EmailLog getEmailLogById(Long id) {
        return emailLogRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + id));
    }

    // Get email log by message ID
    public EmailLog getEmailLogByMessageId(String messageId) {
        return emailLogRepository.findByMessageId(messageId)
                .orElseThrow(() -> new RuntimeException("Email log not found with messageId: " + messageId));
    }

    // Get email statistics
    public Map<String, Object> getEmailStats() {
        Map<String, Object> stats = new HashMap<>();

        // Basic counts
        stats.put("totalEmails", emailLogRepository.count());
        stats.put("sentEmails", emailLogRepository.countByStatus(NotificationStatus.SENT));
        stats.put("failedEmails", emailLogRepository.countByStatus(NotificationStatus.FAILED));
        stats.put("pendingEmails", emailLogRepository.countByStatus(NotificationStatus.PENDING));

        // Emails sent today
        stats.put("emailsSentToday", emailLogRepository.countEmailsSentToday());

        // Get counts by email type using grouped query
        List<Object[]> typeCounts = emailLogRepository.countByEmailTypeGrouped();
        Map<String, Long> emailsByType = new HashMap<>();
        for (Object[] typeCount : typeCounts) {
            EmailType type = (EmailType) typeCount[0];
            Long count = (Long) typeCount[1];
            emailsByType.put(type.name(), count);
        }
        stats.put("emailsByType", emailsByType);

        // Counts by status using grouped query
        List<Object[]> statusCounts = emailLogRepository.countByStatusGrouped();
        Map<String, Long> emailsByStatus = new HashMap<>();
        for (Object[] statusCount : statusCounts) {
            NotificationStatus status = (NotificationStatus) statusCount[0];
            Long count = (Long) statusCount[1];
            emailsByStatus.put(status.name(), count);
        }
        stats.put("emailsByStatus", emailsByStatus);

        // Date range stats (last 7 days)
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime today = LocalDateTime.now();

        stats.put("emailsLast7Days", emailLogRepository.countByStatusAndDateRange(
                NotificationStatus.SENT, weekAgo, today));

        stats.put("failedLast7Days", emailLogRepository.countByStatusAndDateRange(
                NotificationStatus.FAILED, weekAgo, today));

        return stats;
    }

    // Delete email log by ID
    @Transactional
    public void deleteEmailLog(Long id) {
        if (!emailLogRepository.existsById(id)) {
            throw new RuntimeException("Email log not found with id: " + id);
        }
        emailLogRepository.deleteById(id);
    }
}

*/


//package com.major.notification_service.service;
//
//import com.major.notification_service.dto.EmailRequestDTO;
//import com.major.notification_service.model.EmailLog;
//import com.major.notification_service.model.enums.EmailType;
//import com.major.notification_service.model.enums.NotificationStatus;
//import com.major.notification_service.repository.EmailLogRepository;
//import jakarta.mail.internet.MimeMessage;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.mail.javamail.JavaMailSender;
//import org.springframework.mail.javamail.MimeMessageHelper;
//import org.springframework.scheduling.annotation.Async;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.time.LocalDateTime;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.UUID;
//
//@Slf4j
//@Service
//@RequiredArgsConstructor
//public class EmailService {
//
//    private final JavaMailSender mailSender;
//    private final EmailLogRepository emailLogRepository;
//    private final TemplateService templateService;
//
//    @Value("${spring.mail.username}")
//    private String fromEmail;
//
//    @Value("${app.name}")
//    private String appName;
//
//    /**
//     * Send email asynchronously
//     */
//    @Async("emailTaskExecutor")
//    @Transactional
//    public void sendEmailAsync(EmailRequestDTO request) {
//        sendEmail(request);
//    }
//
//    /**
//     * Send email synchronously
//     */
//    @Transactional
//    public void sendEmail(EmailRequestDTO request) {
//        String correlationId = UUID.randomUUID().toString();
//        log.info("Sending email [{}] to: {}, type: {}", correlationId, request.getTo(), request.getEmailType());
//
//        EmailLog emailLog = createEmailLog(request, correlationId);
//
//        try {
//            String content = prepareEmailContent(request);
//            MimeMessage message = createMimeMessage(request, content);
//            mailSender.send(message);
//
//            updateEmailLogSuccess(emailLog);
//            log.info("Email [{}] sent successfully to: {}", correlationId, request.getTo());
//
//        } catch (Exception e) {
//            log.error("Failed to send email [{}] to {}: {}", correlationId, request.getTo(), e.getMessage());
//            updateEmailLogFailure(emailLog, e.getMessage());
//            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
//        }
//    }
//
//    /**
//     * Create MimeMessage from request
//     */
//    private MimeMessage createMimeMessage(EmailRequestDTO request, String content) throws Exception {
//        MimeMessage message = mailSender.createMimeMessage();
//        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
//
//        helper.setFrom(fromEmail);
//        helper.setTo(request.getTo());
//        helper.setSubject(request.getSubject());
//        helper.setText(content, true);
//
//        // Add CC if present
//        if (request.getCc() != null && !request.getCc().isEmpty()) {
//            helper.setCc(request.getCc().toArray(new String[0]));
//        }
//
//        // Add BCC if present
//        if (request.getBcc() != null && !request.getBcc().isEmpty()) {
//            helper.setBcc(request.getBcc().toArray(new String[0]));
//        }
//
//        return message;
//    }
//
//    /**
//     * Prepare email content using template
//     */
//    private String prepareEmailContent(EmailRequestDTO request) {
//        String templateName = request.getTemplateName() != null
//                ? request.getTemplateName()
//                : templateService.getTemplatePath(request.getEmailType());
//
//        Map<String, Object> variables = request.getTemplateData() != null
//                ? new HashMap<>(request.getTemplateData())
//                : new HashMap<>();
//
//        variables = templateService.enrichTemplateData(variables, request.getEmailType());
//
//        return templateService.processTemplate(templateName, variables);
//    }
//
//    /**
//     * Create email log entry
//     */
//    private EmailLog createEmailLog(EmailRequestDTO request, String correlationId) {
//        EmailLog emailLog = EmailLog.builder()
//                .userId(request.getUserId())
//                .recipientEmail(request.getTo())
//                .senderEmail(fromEmail)
//                .subject(request.getSubject())
//                .emailType(request.getEmailType())
//                .status(NotificationStatus.PENDING)
//                .templateName(request.getTemplateName())
//                .templateData(request.getTemplateData())
//                .retryCount(0)
//                .messageId(correlationId)
//                .cc(request.getCc() != null ? String.join(",", request.getCc()) : null)
//                .bcc(request.getBcc() != null ? String.join(",", request.getBcc()) : null)
//                .build();
//
//        return emailLogRepository.save(emailLog);
//    }
//
//    /**
//     * Update email log on success
//     */
//    private void updateEmailLogSuccess(EmailLog emailLog) {
//        emailLog.setStatus(NotificationStatus.SENT);
//        emailLog.setSentAt(LocalDateTime.now());
//        emailLogRepository.save(emailLog);
//    }
//
//    /**
//     * Update email log on failure
//     */
//    private void updateEmailLogFailure(EmailLog emailLog, String errorMessage) {
//        emailLog.setStatus(NotificationStatus.FAILED);
//        emailLog.setErrorMessage(errorMessage);
//        emailLog.setRetryCount(emailLog.getRetryCount() + 1);
//        emailLogRepository.save(emailLog);
//    }
//
//    /**
//     * Retry failed email
//     */
//    @Transactional
//    public void retryFailedEmail(Long logId) {
//        EmailLog emailLog = emailLogRepository.findById(logId)
//                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + logId));
//
//        if (emailLog.getRetryCount() >= 3) {
//            throw new RuntimeException("Maximum retry attempts reached for email: " + logId);
//        }
//
//        EmailRequestDTO request = EmailRequestDTO.builder()
//                .to(emailLog.getRecipientEmail())
//                .subject(emailLog.getSubject())
//                .emailType(emailLog.getEmailType())
//                .templateName(emailLog.getTemplateName())
//                .templateData(emailLog.getTemplateData())
//                .userId(emailLog.getUserId())
//                .build();
//
//        sendEmail(request);
//    }
//
//    // ============= QUERY METHODS =============
//
//    public List<EmailLog> getEmailLogsByUserId(String userId) {
//        return emailLogRepository.findByUserId(userId);
//    }
//
//    public Page<EmailLog> getEmailLogsByUserId(String userId, Pageable pageable) {
//        return emailLogRepository.findByUserId(userId, pageable);
//    }
//
//    public List<EmailLog> getEmailLogsByType(EmailType emailType) {
//        return emailLogRepository.findByEmailType(emailType);
//    }
//
//    public List<EmailLog> getEmailLogsByStatus(NotificationStatus status) {
//        return emailLogRepository.findByStatus(status);
//    }
//
//    public List<EmailLog> getEmailLogsByDateRange(LocalDateTime start, LocalDateTime end) {
//        return emailLogRepository.findEmailsSentBetween(start, end);
//    }
//
//    public EmailLog getEmailLogById(Long id) {
//        return emailLogRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + id));
//    }
//
//    public EmailLog getEmailLogByMessageId(String messageId) {
//        return emailLogRepository.findByMessageId(messageId)
//                .orElseThrow(() -> new RuntimeException("Email log not found with messageId: " + messageId));
//    }
//
//    /**
//     * Get email statistics
//     */
//    public Map<String, Object> getEmailStats() {
//        Map<String, Object> stats = new HashMap<>();
//
//        // Basic counts
//        stats.put("totalEmails", emailLogRepository.count());
//        stats.put("sentEmails", emailLogRepository.countByStatus(NotificationStatus.SENT));
//        stats.put("failedEmails", emailLogRepository.countByStatus(NotificationStatus.FAILED));
//        stats.put("pendingEmails", emailLogRepository.countByStatus(NotificationStatus.PENDING));
//
//        // Emails sent today
//        stats.put("emailsSentToday", emailLogRepository.countEmailsSentToday());
//
//        // FIXED: Get counts by email type using grouped query
//        List<Object[]> typeCounts = emailLogRepository.countByEmailTypeGrouped();
//        Map<String, Long> emailsByType = new HashMap<>();
//        for (Object[] typeCount : typeCounts) {
//            EmailType type = (EmailType) typeCount[0];
//            Long count = (Long) typeCount[1];
//            emailsByType.put(type.name(), count);
//        }
//        stats.put("emailsByType", emailsByType);
//
//        // Counts by status using grouped query
//        List<Object[]> statusCounts = emailLogRepository.countByStatusGrouped();
//        Map<String, Long> emailsByStatus = new HashMap<>();
//        for (Object[] statusCount : statusCounts) {
//            NotificationStatus status = (NotificationStatus) statusCount[0];
//            Long count = (Long) statusCount[1];
//            emailsByStatus.put(status.name(), count);
//        }
//        stats.put("emailsByStatus", emailsByStatus);
//
//        // Date range stats (last 7 days)
//        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
//        LocalDateTime today = LocalDateTime.now();
//
//        stats.put("emailsLast7Days", emailLogRepository.countByStatusAndDateRange(
//                NotificationStatus.SENT, weekAgo, today));
//
//        stats.put("failedLast7Days", emailLogRepository.countByStatusAndDateRange(
//                NotificationStatus.FAILED, weekAgo, today));
//
//        return stats;
//    }
//
//    @Transactional
//    public void deleteEmailLog(Long id) {
//        if (!emailLogRepository.existsById(id)) {
//            throw new RuntimeException("Email log not found with id: " + id);
//        }
//        emailLogRepository.deleteById(id);
//    }
//}
//
////package com.major.notification_service.service;
////
////import com.major.notification_service.dto.EmailRequestDTO;
////import com.major.notification_service.model.EmailLog;
////import com.major.notification_service.model.enums.EmailType;
////import com.major.notification_service.model.enums.NotificationStatus;
////import com.major.notification_service.repository.EmailLogRepository;
////import jakarta.mail.internet.MimeMessage;
////import lombok.RequiredArgsConstructor;
////import lombok.extern.slf4j.Slf4j;
////import org.springframework.beans.factory.annotation.Value;
////import org.springframework.data.domain.Page;
////import org.springframework.data.domain.Pageable;
////import org.springframework.mail.javamail.JavaMailSender;
////import org.springframework.mail.javamail.MimeMessageHelper;
////import org.springframework.scheduling.annotation.Async;
////import org.springframework.stereotype.Service;
////import org.springframework.transaction.annotation.Transactional;
////
////import java.time.LocalDateTime;
////import java.util.HashMap;
////import java.util.List;
////import java.util.Map;
////import java.util.UUID;
////
////@Slf4j
////@Service
////@RequiredArgsConstructor
////public class EmailService {
////
////    private final JavaMailSender mailSender;
////    private final EmailLogRepository emailLogRepository;
////    private final TemplateService templateService;
////
////    @Value("${spring.mail.username}")
////    private String fromEmail;
////
////    @Value("${app.name}")
////    private String appName;
////
////    /**
////     * Send email asynchronously
////     */
////    @Async("emailTaskExecutor")
////    @Transactional
////    public void sendEmailAsync(EmailRequestDTO request) {
////        sendEmail(request);
////    }
////
////    /**
////     * Send email synchronously
////     */
////    @Transactional
////    public void sendEmail(EmailRequestDTO request) {
////        String correlationId = UUID.randomUUID().toString();
////        log.info("Sending email [{}] to: {}, type: {}", correlationId, request.getTo(), request.getEmailType());
////
////        EmailLog emailLog = createEmailLog(request, correlationId);
////
////        try {
////            String content = prepareEmailContent(request);
////            MimeMessage message = createMimeMessage(request, content);
////            mailSender.send(message);
////
////            updateEmailLogSuccess(emailLog);
////            log.info("Email [{}] sent successfully to: {}", correlationId, request.getTo());
////
////        } catch (Exception e) {
////            log.error("Failed to send email [{}] to {}: {}", correlationId, request.getTo(), e.getMessage());
////            updateEmailLogFailure(emailLog, e.getMessage());
////            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
////        }
////    }
////
////    /**
////     * Create MimeMessage from request
////     */
////    private MimeMessage createMimeMessage(EmailRequestDTO request, String content) throws Exception {
////        MimeMessage message = mailSender.createMimeMessage();
////        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
////
////        helper.setFrom(fromEmail);
////        helper.setTo(request.getTo());
////        helper.setSubject(request.getSubject());
////        helper.setText(content, true);
////
////        // Add CC if present
////        if (request.getCc() != null && !request.getCc().isEmpty()) {
////            helper.setCc(request.getCc().toArray(new String[0]));
////        }
////
////        // Add BCC if present
////        if (request.getBcc() != null && !request.getBcc().isEmpty()) {
////            helper.setBcc(request.getBcc().toArray(new String[0]));
////        }
////
////        return message;
////    }
////
////    /**
////     * Prepare email content using template
////     */
////    private String prepareEmailContent(EmailRequestDTO request) {
////        String templateName = request.getTemplateName() != null
////                ? request.getTemplateName()
////                : templateService.getTemplatePath(request.getEmailType());
////
////        Map<String, Object> variables = request.getTemplateData() != null
////                ? new HashMap<>(request.getTemplateData())
////                : new HashMap<>();
////
////        variables = templateService.enrichTemplateData(variables, request.getEmailType());
////
////        return templateService.processTemplate(templateName, variables);
////    }
////
////    /**
////     * Create email log entry
////     */
////    private EmailLog createEmailLog(EmailRequestDTO request, String correlationId) {
////        EmailLog emailLog = EmailLog.builder()
////                .userId(request.getUserId())
////                .recipientEmail(request.getTo())
////                .senderEmail(fromEmail)
////                .subject(request.getSubject())
////                .emailType(request.getEmailType())
////                .status(NotificationStatus.PENDING)
////                .templateName(request.getTemplateName())
////                .templateData(request.getTemplateData())
////                .retryCount(0)
////                .messageId(correlationId)
////                .cc(request.getCc() != null ? String.join(",", request.getCc()) : null)
////                .bcc(request.getBcc() != null ? String.join(",", request.getBcc()) : null)
////                .build();
////
////        return emailLogRepository.save(emailLog);
////    }
////
////    /**
////     * Update email log on success
////     */
////    private void updateEmailLogSuccess(EmailLog emailLog) {
////        emailLog.setStatus(NotificationStatus.SENT);
////        emailLog.setSentAt(LocalDateTime.now());
////        emailLogRepository.save(emailLog);
////    }
////
////    /**
////     * Update email log on failure
////     */
////    private void updateEmailLogFailure(EmailLog emailLog, String errorMessage) {
////        emailLog.setStatus(NotificationStatus.FAILED);
////        emailLog.setErrorMessage(errorMessage);
////        emailLog.setRetryCount(emailLog.getRetryCount() + 1);
////        emailLogRepository.save(emailLog);
////    }
////
////    /**
////     * Retry failed email
////     */
////    @Transactional
////    public void retryFailedEmail(Long logId) {
////        EmailLog emailLog = emailLogRepository.findById(logId)
////                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + logId));
////
////        if (emailLog.getRetryCount() >= 3) {
////            throw new RuntimeException("Maximum retry attempts reached for email: " + logId);
////        }
////
////        EmailRequestDTO request = EmailRequestDTO.builder()
////                .to(emailLog.getRecipientEmail())
////                .subject(emailLog.getSubject())
////                .emailType(emailLog.getEmailType())
////                .templateName(emailLog.getTemplateName())
////                .templateData(emailLog.getTemplateData())
////                .userId(emailLog.getUserId())
////                .build();
////
////        sendEmail(request);
////    }
////
////    // ============= QUERY METHODS =============
////
////    public List<EmailLog> getEmailLogsByUserId(String userId) {
////        return emailLogRepository.findByUserId(userId);
////    }
////
////    public Page<EmailLog> getEmailLogsByUserId(String userId, Pageable pageable) {
////        return emailLogRepository.findByUserId(userId, pageable);
////    }
////
////    public List<EmailLog> getEmailLogsByType(EmailType emailType) {
////        return emailLogRepository.findByEmailType(emailType);
////    }
////
////    public List<EmailLog> getEmailLogsByStatus(NotificationStatus status) {
////        return emailLogRepository.findByStatus(status);
////    }
////
////    public List<EmailLog> getEmailLogsByDateRange(LocalDateTime start, LocalDateTime end) {
////        return emailLogRepository.findEmailsSentBetween(start, end);
////    }
////
////    public EmailLog getEmailLogById(Long id) {
////        return emailLogRepository.findById(id)
////                .orElseThrow(() -> new RuntimeException("Email log not found with id: " + id));
////    }
////
////    public EmailLog getEmailLogByMessageId(String messageId) {
////        return emailLogRepository.findByMessageId(messageId)
////                .orElseThrow(() -> new RuntimeException("Email log not found with messageId: " + messageId));
////    }
////
////    public Map<String, Object> getEmailStats() {
////        Map<String, Object> stats = new HashMap<>();
////        stats.put("totalEmails", emailLogRepository.count());
////        stats.put("sentEmails", emailLogRepository.countByStatus(NotificationStatus.SENT));
////        stats.put("failedEmails", emailLogRepository.countByStatus(NotificationStatus.FAILED));
////        stats.put("pendingEmails", emailLogRepository.countByStatus(NotificationStatus.PENDING));
////        stats.put("emailsByType", emailLogRepository.countByEmailType());
////        return stats;
////    }
////
////    @Transactional
////    public void deleteEmailLog(Long id) {
////        if (!emailLogRepository.existsById(id)) {
////            throw new RuntimeException("Email log not found with id: " + id);
////        }
////        emailLogRepository.deleteById(id);
////    }
////}