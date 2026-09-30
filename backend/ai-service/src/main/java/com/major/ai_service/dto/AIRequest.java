package com.major.ai_service.dto;
import lombok.*;
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
