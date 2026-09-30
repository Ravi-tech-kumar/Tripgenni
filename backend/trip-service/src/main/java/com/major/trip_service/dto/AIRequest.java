package com.major.trip_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIRequest {
    private String destination;
    private int days;
    private double budget;
    private String travelStyle;
    private List<String> interests;
}