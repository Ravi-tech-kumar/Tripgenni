package com.major.user_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "travel_preference")
public class TravelPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    private String budgetRange;
    private String preferredClimate;
    private String travelStyle; // luxury, backpacking, family
    private String foodPreference;

    @ElementCollection
    @CollectionTable(name = "preference_interests", joinColumns = @JoinColumn(name = "preference_id"))
    @Column(name = "interest")
    private List<String> interestTags = new ArrayList<>();

    private Integer groupSize; // Added this field for group size preference
}