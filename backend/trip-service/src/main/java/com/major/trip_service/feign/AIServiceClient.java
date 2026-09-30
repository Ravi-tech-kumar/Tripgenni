package com.major.trip_service.feign;

import com.major.trip_service.dto.AIRequest;
import com.major.trip_service.dto.AIResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
@FeignClient(name = "ai-service", url = "http://localhost:8084")
public interface AIServiceClient {

    @PostMapping("/api/ai/generate")
    AIResponse generateItinerary(AIRequest request);
}
