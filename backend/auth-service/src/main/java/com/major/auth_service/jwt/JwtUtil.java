package com.major.auth_service.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    // Fix: @Value works at runtime (Spring-injected), but getSigningKey() is called
    // before injection if used in field initializer — so we use a lazy getter instead.
    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // Lazy key builder — safe because @Value is injected before any method is called
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    // Fix: JJWT 0.12+ uses .subject(), .issuedAt(), .expiration() instead of
    // .setSubject(), .setIssuedAt(), .setExpiration()
    public String generateToken(UUID userId, String role) {
        return Jwts.builder()
                .subject(userId.toString())               // was setSubject()
                .claim("role", role)
                .issuedAt(new Date())                     // was setIssuedAt()
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration)) // was setExpiration()
                .signWith(getSigningKey())                // no need to pass algorithm — inferred from key
                .compact();
    }

    // Fix: JJWT 0.12+ uses Jwts.parser() (not parserBuilder()) with .verifyWith()
    public UUID validateAndGetUserId(String token) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())              // was .setSigningKey()
                .build()
                .parseSignedClaims(token)                 // was parseClaimsJws()
                .getPayload();                            // was getBody()
        return UUID.fromString(claims.getSubject());
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}


//package com.major.auth_service.jwt;
//
//import io.jsonwebtoken.*;
//import io.jsonwebtoken.security.Keys;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Component;
//
//import java.nio.charset.StandardCharsets;
//import java.security.Key;
//import java.util.Date;
//import java.util.UUID;
//
//@Component
//public class JwtUtil {
//
//    @Value("${jwt.secret}")
//    private String jwtSecret;
//
//    @Value("${jwt.expiration}")
//    private long jwtExpiration; // in milliseconds
//
//    private Key getSigningKey() {
//        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
//    }
//
//    // Generate JWT token
//    public String generateToken(UUID userId, String role) {
//        return Jwts.builder()
//                .setSubject(userId.toString())
//                .claim("role", role)
//                .setIssuedAt(new Date())
//                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
//                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
//                .compact();
//    }
//
//    // Validate token and return userId
//    public UUID validateAndGetUserId(String token) throws JwtException {
//        Claims claims = Jwts.parser()
//                .setSigningKey(getSigningKey())
//                .build()
//                .parseClaimsJws(token)
//                .getBody();
//        return UUID.fromString(claims.getSubject());
//    }
//
//    // Optional: validate token
//    public boolean validateToken(String token) {
//        try {
//            Jwts.parser()
//                    .setSigningKey(getSigningKey())
//                    .build()
//                    .parseClaimsJws(token);
//            return true;
//        } catch (JwtException | IllegalArgumentException e) {
//            return false;
//        }
//    }
//}