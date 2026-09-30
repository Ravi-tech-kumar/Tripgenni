package com.major.trip_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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