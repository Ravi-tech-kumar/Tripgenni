package com.major.user_service.controller;

import com.major.user_service.entity.SavedDestination;
import com.major.user_service.entity.TravelPreference;
import com.major.user_service.entity.UserProfile;
import com.major.user_service.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

//@CrossOrigin(origins = "*")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"}, allowCredentials = "true")
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ================= PROFILE ENDPOINTS =================
    @PostMapping("/profile")
    public ResponseEntity<UserProfile> createProfile(@RequestBody UserProfile profile) {
        return ResponseEntity.ok(userService.createProfile(profile));
    }

    @PutMapping("/profile/{authUserId}")
    public ResponseEntity<UserProfile> updateProfile(@PathVariable UUID authUserId,
                                                     @RequestBody UserProfile profile) {
        return ResponseEntity.ok(userService.updateProfile(authUserId, profile));
    }

//    @GetMapping("/profile/{authUserId}")
//    public ResponseEntity<UserProfile> getProfile(@PathVariable UUID authUserId) {
//        UserProfile profile = userService.getProfile(authUserId);
//        if (profile == null) {
//            return ResponseEntity.notFound().build();
//        }
//        return ResponseEntity.ok(profile);
//    }
@GetMapping("/profile/{authUserId}")
public ResponseEntity<UserProfile> getProfile(@PathVariable UUID authUserId) {
    UserProfile profile = userService.getProfile(authUserId);
    if (profile == null) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null); // Explicit 404
    }
    return ResponseEntity.ok(profile);
}

    // ================= PREFERENCE ENDPOINTS =================
    @PostMapping("/preferences")
    public ResponseEntity<TravelPreference> savePreference(@RequestBody TravelPreference pref) {
        return ResponseEntity.ok(userService.savePreference(pref));
    }

    @PutMapping("/preferences/{userId}")
    public ResponseEntity<TravelPreference> updatePreference(@PathVariable UUID userId,
                                                             @RequestBody TravelPreference pref) {
        return ResponseEntity.ok(userService.updatePreference(userId, pref));
    }

    @GetMapping("/preferences/{userId}")
    public ResponseEntity<TravelPreference> getPreference(@PathVariable UUID userId) {
        TravelPreference preference = userService.getPreference(userId);
        if (preference == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(preference);
    }

    // ================= DESTINATION ENDPOINTS =================
    @PostMapping("/destinations")
    public ResponseEntity<SavedDestination> addDestination(@RequestBody SavedDestination dest) {
        return ResponseEntity.ok(userService.addSavedDestination(dest));
    }

    @GetMapping("/destinations/{userId}")
    public ResponseEntity<List<SavedDestination>> getDestinations(@PathVariable UUID userId) {
        return ResponseEntity.ok(userService.getSavedDestinations(userId));
    }

    @DeleteMapping("/destinations/{destinationId}")
    public ResponseEntity<Void> removeDestination(@PathVariable UUID destinationId) {
        userService.removeSavedDestination(destinationId);
        return ResponseEntity.noContent().build();
    }
}