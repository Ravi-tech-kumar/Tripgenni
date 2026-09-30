package com.major.trip_service.entity;


import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "trip_expense")
public class TripExpense {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tripId;

    private String category; // flight, hotel, food
    private Double amount;
    private String currency;
}
