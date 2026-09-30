package com.major.trip_service.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "auth-service")
public interface AuthServiceClient {
    @GetMapping("/api/auth/validate")
    boolean validateToken(@RequestHeader("Authorization") String bearerToken);
}