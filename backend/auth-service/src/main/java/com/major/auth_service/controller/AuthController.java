package com.major.auth_service.controller;

import com.major.auth_service.dto.LoginRequest;
import com.major.auth_service.dto.RegisterRequest;
import com.major.auth_service.entity.AuthUser;
import com.major.auth_service.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

//@CrossOrigin(origins = "*")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}, allowCredentials = "true")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // Fix 1: Removed @Autowired on field — constructor injection is sufficient
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        authService.register(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        // Fix 2: Null check before using user — returns clean 401 instead of NullPointerException
        AuthUser user = authService.getUserByEmail(request.getEmail());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Validate password
        authService.validatePassword(user, request.getPassword());

        // Generate JWT
        String accessToken = authService.generateJwtToken(user);

        // Generate refresh token
        String refreshToken = authService.createRefreshToken(user.getId());

        return ResponseEntity.ok(Map.of(
                "userId", user.getId(),
                "accessToken", accessToken,
                "refreshToken", refreshToken
        ));
    }
}
//package com.major.auth_service.controller;
//
//
//import com.major.auth_service.dto.LoginRequest;
//import com.major.auth_service.dto.RegisterRequest;
//import com.major.auth_service.entity.AuthUser;
//import com.major.auth_service.service.AuthService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.Map;
//@CrossOrigin(origins="*")
//@RestController
//@RequestMapping("/api/auth")
//public class AuthController {
//    @Autowired
//    private final AuthService authService;
//
//    public AuthController(AuthService authService) {
//        this.authService = authService;
//    }
//
//    @PostMapping("/register")
//    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
//        authService.register(request.getEmail(), request.getPassword());
//        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
//    }
//
//    @PostMapping("/login")
//    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
//        // ️ Find user by email
//        AuthUser user = authService.getUserByEmail(request.getEmail());
//
//        //  Validate password
//        authService.validatePassword(user, request.getPassword());
//
//        // Generate JWT
//        String accessToken = authService.generateJwtToken(user);
//
//        //  Generate refresh token
//        String refreshToken = authService.createRefreshToken(user.getId());
//
//        return ResponseEntity.ok(Map.of(
//                "userId", user.getId(),
//                "accessToken", accessToken,
//                "refreshToken", refreshToken
//        ));
//    }
//
//}
//
