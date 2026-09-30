package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailOrchestratorService {

    private final EmailService emailService;
    private final RabbitMQProducerService rabbitMQProducerService;

    @Value("${rabbitmq.enabled:false}")
    private boolean rabbitMQEnabled;

    /**
     * Send email intelligently - uses RabbitMQ if available, otherwise direct email
     */
    public void sendEmail(EmailRequestDTO request) {
        if (isRabbitMQAvailable()) {
            log.info("🐇 Using RabbitMQ for email delivery to: {}", request.getTo());
            sendViaRabbitMQ(request);
        } else {
            log.info("📧 RabbitMQ not available, sending email directly to: {}", request.getTo());
            sendDirectly(request);
        }
    }

    private boolean isRabbitMQAvailable() {
        if (!rabbitMQEnabled) return false;

        try {
            // Check if RabbitMQ is actually running
            rabbitMQProducerService.checkConnection();
            return true;
        } catch (Exception e) {
            log.warn("⚠️ RabbitMQ is not available, falling back to direct email");
            return false;
        }
    }

    private void sendViaRabbitMQ(EmailRequestDTO request) {
        try {
            rabbitMQProducerService.sendEmailNotification(request);
            log.info("✅ Email queued in RabbitMQ for: {}", request.getTo());
        } catch (Exception e) {
            log.error("❌ Failed to queue in RabbitMQ, falling back to direct: {}", e.getMessage());
            sendDirectly(request);
        }
    }

    private void sendDirectly(EmailRequestDTO request) {
        try {
            emailService.sendEmail(request);
            log.info("✅ Email sent directly to: {}", request.getTo());
        } catch (Exception e) {
            log.error("❌ Failed to send email directly: {}", e.getMessage());
            throw new RuntimeException("Email delivery failed", e);
        }
    }
}