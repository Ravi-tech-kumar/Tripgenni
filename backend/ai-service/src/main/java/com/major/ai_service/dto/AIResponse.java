package com.major.ai_service.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIResponse {
    private String tripSummary;
    private List<Map<String, Object>> dailyItinerary;
    private double estimatedBudget;
    private List<String> tips;
}