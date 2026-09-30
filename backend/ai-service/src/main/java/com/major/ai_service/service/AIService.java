package com.major.ai_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.major.ai_service.dto.AIRequest;
import com.major.ai_service.dto.AIResponse;
import org.springframework.ai.chat.client.ChatClient;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AIService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public AIService(ChatClient chatClient, ObjectMapper objectMapper) {
        this.chatClient = chatClient;
        this.objectMapper = objectMapper;
    }

    public AIResponse generateItinerary(AIRequest request) {
        try {
            String prompt = String.format("""
                You are an expert travel planner AI.
                Create a %d-day itinerary for %s with a budget of %.2f.
                Travel style: %s
                Interests: %s
                Return JSON with the following format:
                {
                    "tripSummary": "...",
                    "dailyItinerary": [{"day":1,"title":"...","activities":[...],"estimatedCost":...}],
                    "estimatedBudget": ...,
                    "tips": ["..."]
                }
                """,
                    request.getDays(),
                    request.getDestination(),
                    request.getBudget(),
                    request.getTravelStyle(),
                    String.join(", ", request.getInterests())
            );

            ChatMessage userMessage = ChatMessage.ofUser(prompt);

            ChatCompletionRequest completionRequest = ChatCompletionRequest.builder()
                    .model("mistral-7b") // your model name on Ollama server
                    .messages(List.of(userMessage))
                    .temperature(0.7)
                    .maxTokens(1500)
                    .build();

// Send request synchronously
            ChatMessage aiResponseMessage = chatClient.chat(completionRequest).block();

            if (aiResponseMessage == null || aiResponseMessage.content() == null) {
                throw new RuntimeException("No response from AI");
            }

// Correct: use .content() instead of getContent()
            return objectMapper.readValue(aiResponseMessage.content(), AIResponse.class);

        }
}
