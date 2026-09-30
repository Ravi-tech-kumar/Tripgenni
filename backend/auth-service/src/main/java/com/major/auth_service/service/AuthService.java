package com.major.auth_service.service;



import com.major.auth_service.entity.AuthUser;
import com.major.auth_service.entity.RefreshToken;
import com.major.auth_service.jwt.JwtUtil;
import com.major.auth_service.repo.AuthUserRepository;
import com.major.auth_service.repo.RefreshTokenRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AuthUserRepository userRepo;
    private final RefreshTokenRepository tokenRepo;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(AuthUserRepository userRepo, RefreshTokenRepository tokenRepo, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
        this.jwtUtil = jwtUtil;
    }

    public AuthUser register(String email, String password) {
        if(userRepo.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        AuthUser user = new AuthUser();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole("USER");
        user.setCreatedAt(LocalDateTime.now());
        return userRepo.save(user);
    }

    public String login(String email, String password) {
        AuthUser user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if(!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid password");
        }
        return jwtUtil.generateToken(user.getId(), user.getRole());
    }

    public String createRefreshToken(UUID userId) {
        RefreshToken token = new RefreshToken();
        token.setUserId(userId);
        token.setToken(UUID.randomUUID().toString());
        token.setExpiryDate(LocalDateTime.now().plusDays(7));
        token.setRevoked(false);
        tokenRepo.save(token);
        return token.getToken();
    }

    public Optional<RefreshToken> verifyRefreshToken(String token) {
        Optional<RefreshToken> refreshToken = tokenRepo.findByToken(token);
        if(refreshToken.isPresent() && !refreshToken.get().isRevoked()
                && refreshToken.get().getExpiryDate().isAfter(LocalDateTime.now())) {
            return refreshToken;
        }
        return Optional.empty();
    }

    public AuthUser getUserByEmail(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public void validatePassword(AuthUser user, String password) {
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid password");
        }
    }

    public String generateJwtToken(AuthUser user) {
        return jwtUtil.generateToken(user.getId(), user.getRole());
    }

}
