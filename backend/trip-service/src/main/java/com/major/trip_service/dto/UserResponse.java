package com.major.trip_service.dto;



import lombok.Data;

import java.util.UUID;

@Data
public class UserResponse {
    private UUID id;
    private String fullName;
    private String country;
}