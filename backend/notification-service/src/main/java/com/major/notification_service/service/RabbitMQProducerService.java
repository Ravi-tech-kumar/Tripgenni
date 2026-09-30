package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnClass(name = "org.springframework.amqp.rabbit.core.RabbitTemplate")
@RequiredArgsConstructor
public class RabbitMQProducerService {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchange.notification:notification.exchange}")
    private String exchange;

    @Value("${rabbitmq.routingkey.notification:notification.routingkey}")
    private String routingKey;

    public void sendEmailNotification(EmailRequestDTO request) {
        log.info("📤 Sending email to RabbitMQ queue");
        log.info("   Exchange: {}", exchange);
        log.info("   Routing Key: {}", routingKey);
        log.info("   Recipient: {}", request.getTo());

        rabbitTemplate.convertAndSend(exchange, routingKey, request);
        log.info("✅ Email queued successfully");
    }

    public void checkConnection() {
        // This will throw an exception if RabbitMQ is not available
        rabbitTemplate.getConnectionFactory().createConnection().close();
    }
}