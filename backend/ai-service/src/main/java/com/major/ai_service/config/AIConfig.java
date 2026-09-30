package com.major.ai_service.config;


import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AIConfig {

    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        // Create ChatClient using the auto-configured ChatModel
        return ChatClient.create(chatModel);
    }
}
