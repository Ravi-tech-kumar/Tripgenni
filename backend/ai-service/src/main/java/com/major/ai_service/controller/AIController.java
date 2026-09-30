package com.major.ai_service.controller;

import com.major.ai_service.dto.AIRequest;
import com.major.ai_service.dto.AIResponse;
import com.major.ai_service.service.AIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final AIService aiService;

    public AIController(AIService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/generate")
    public ResponseEntity<AIResponse> generate(@RequestBody AIRequest request) {
        AIResponse response = aiService.generateItinerary(request);
        return ResponseEntity.ok(response);
    }
}
