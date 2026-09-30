package com.major.trip_service.feign;

import com.major.trip_service.dto.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;
@FeignClient(name = "user-service", url = "http://localhost:8082")
public interface UserServiceClient {
    @GetMapping("/api/users/{userId}")
    UserResponse getUserById(@PathVariable UUID userId);
}
