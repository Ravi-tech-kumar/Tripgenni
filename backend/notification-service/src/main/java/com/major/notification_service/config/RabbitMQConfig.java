package com.major.notification_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.queue.notification}")
    private String notificationQueue;

    @Value("${rabbitmq.exchange.notification}")
    private String notificationExchange;

    @Value("${rabbitmq.routingkey.notification}")
    private String notificationRoutingKey;

    @Value("${rabbitmq.queue.dead-letter}")
    private String deadLetterQueue;

    @Value("${rabbitmq.exchange.dead-letter}")
    private String deadLetterExchange;

    @Bean
    public Queue notificationQueue() {
        return QueueBuilder.durable(notificationQueue)
                .withArgument("x-dead-letter-exchange", deadLetterExchange)
                .withArgument("x-dead-letter-routing-key", "notification.dead")
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(deadLetterQueue).build();
    }

    @Bean
    public TopicExchange notificationExchange() {
        return ExchangeBuilder.topicExchange(notificationExchange)
                .durable(true)
                .build();
    }

    @Bean
    public TopicExchange deadLetterExchange() {
        return ExchangeBuilder.topicExchange(deadLetterExchange)
                .durable(true)
                .build();
    }

    @Bean
    public Binding notificationBinding() {
        return BindingBuilder
                .bind(notificationQueue())
                .to(notificationExchange())
                .with(notificationRoutingKey);
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder
                .bind(deadLetterQueue())
                .to(deadLetterExchange())
                .with("notification.dead");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());
        return rabbitTemplate;
    }
}
//package com.major.notification_service.config;
//
//import org.springframework.amqp.core.*;
//import org.springframework.amqp.rabbit.connection.ConnectionFactory;
//import org.springframework.amqp.rabbit.core.RabbitTemplate;
//import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
//import org.springframework.amqp.support.converter.MessageConverter;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//
//@Configuration
//public class RabbitMQConfig {
//
//    @Value("${rabbitmq.queue.notification}")
//    private String notificationQueue;
//
//    @Value("${rabbitmq.exchange.notification}")
//    private String notificationExchange;
//
//    @Value("${rabbitmq.routingkey.notification}")
//    private String notificationRoutingKey;
//
//    @Value("${rabbitmq.queue.dead-letter}")
//    private String deadLetterQueue;
//
//    @Value("${rabbitmq.exchange.dead-letter}")
//    private String deadLetterExchange;
//
//    @Bean
//    public Queue notificationQueue() {
//        return QueueBuilder.durable(notificationQueue)
//                .withArgument("x-dead-letter-exchange", deadLetterExchange)
//                .withArgument("x-dead-letter-routing-key", "notification.dead")
//                .withArgument("x-max-retries", 3)
//                .withArgument("x-retry-delay", 5000)
//                .build();
//    }
//
//    @Bean
//    public Queue deadLetterQueue() {
//        return QueueBuilder.durable(deadLetterQueue).build();
//    }
//
//    @Bean
//    public TopicExchange notificationExchange() {
//        return ExchangeBuilder.topicExchange(notificationExchange)
//                .durable(true)
//                .build();
//    }
//
//    @Bean
//    public TopicExchange deadLetterExchange() {
//        return ExchangeBuilder.topicExchange(deadLetterExchange)
//                .durable(true)
//                .build();
//    }
//
//    @Bean
//    public Binding notificationBinding() {
//        return BindingBuilder
//                .bind(notificationQueue())
//                .to(notificationExchange())
//                .with(notificationRoutingKey);
//    }
//
//    @Bean
//    public Binding deadLetterBinding() {
//        return BindingBuilder
//                .bind(deadLetterQueue())
//                .to(deadLetterExchange())
//                .with("notification.dead");
//    }
//
//    @Bean
//    public MessageConverter jsonMessageConverter() {
//        return new Jackson2JsonMessageConverter();
//    }








//    @Bean
//    public AmqpTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
//        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
//        rabbitTemplate.setMessageConverter(jsonMessageConverter());
//        return rabbitTemplate;
//    }
//@Bean
//public AmqpTemplate customRabbitTemplate(ConnectionFactory connectionFactory) {
//    RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
//    rabbitTemplate.setMessageConverter(jsonMessageConverter());
//    return rabbitTemplate;
//}
//}