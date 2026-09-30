package com.major.user_service.service;

import com.major.user_service.entity.SavedDestination;
import com.major.user_service.entity.TravelPreference;
import com.major.user_service.entity.UserProfile;
import com.major.user_service.repo.SavedDestinationRepository;
import com.major.user_service.repo.TravelPreferenceRepository;
import com.major.user_service.repo.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserProfileRepository profileRepo;
    private final TravelPreferenceRepository prefRepo;
    private final SavedDestinationRepository destRepo;

    public UserService(UserProfileRepository profileRepo,
                       TravelPreferenceRepository prefRepo,
                       SavedDestinationRepository destRepo) {
        this.profileRepo = profileRepo;
        this.prefRepo = prefRepo;
        this.destRepo = destRepo;
    }

    // ================= PROFILE METHODS =================
    public UserProfile createProfile(UserProfile profile) {
        return profileRepo.save(profile);
    }

    public UserProfile updateProfile(UUID authUserId, UserProfile profile) {
        UserProfile existingProfile = profileRepo.findByAuthUserId(authUserId);
        if (existingProfile != null) {
            existingProfile.setFullName(profile.getFullName());
            existingProfile.setPhoneNumber(profile.getPhoneNumber());
            existingProfile.setCountry(profile.getCountry());
            existingProfile.setBio(profile.getBio());
            return profileRepo.save(existingProfile);
        }
        return profileRepo.save(profile);
    }

    public UserProfile getProfile(UUID authUserId) {
        return profileRepo.findByAuthUserId(authUserId);
    }

    // ================= PREFERENCE METHODS =================
    public TravelPreference savePreference(TravelPreference pref) {
        return prefRepo.save(pref);
    }

    public TravelPreference updatePreference(UUID userId, TravelPreference pref) {
        TravelPreference existingPref = prefRepo.findByUserId(userId);
        if (existingPref != null) {
            existingPref.setBudgetRange(pref.getBudgetRange());
            existingPref.setPreferredClimate(pref.getPreferredClimate());
            existingPref.setTravelStyle(pref.getTravelStyle());
            existingPref.setFoodPreference(pref.getFoodPreference());
            existingPref.setInterestTags(pref.getInterestTags());
            existingPref.setGroupSize(pref.getGroupSize());
            return prefRepo.save(existingPref);
        }
        return prefRepo.save(pref);
    }

    public TravelPreference getPreference(UUID userId) {
        return prefRepo.findByUserId(userId);
    }

    // ================= DESTINATION METHODS =================
    public SavedDestination addSavedDestination(SavedDestination dest) {
        return destRepo.save(dest);
    }

    public List<SavedDestination> getSavedDestinations(UUID userId) {
        return destRepo.findAllByUserId(userId);
    }

    @Transactional
    public void removeSavedDestination(UUID destinationId) {
        destRepo.deleteById(destinationId);
    }
}