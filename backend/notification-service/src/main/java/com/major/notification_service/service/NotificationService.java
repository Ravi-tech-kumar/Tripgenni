
package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.NotificationResponseDTO;
import com.major.notification_service.model.NotificationEvent;
import com.major.notification_service.model.enums.EventType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.repository.NotificationEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;
    private final NotificationEventRepository eventRepository;

    /**
     * Send email notification
     */
    public NotificationResponseDTO sendEmailNotification(EmailRequestDTO request) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Processing email notification request with correlationId: {}", correlationId);

        try {
            emailService.sendEmail(request);

            return NotificationResponseDTO.builder()
                    .notificationId(UUID.randomUUID().toString())
                    .correlationId(correlationId)
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .message("Email notification sent successfully")
                    .build();

        } catch (Exception e) {
            log.error("Failed to send email notification: {}", e.getMessage());

            return NotificationResponseDTO.builder()
                    .notificationId(UUID.randomUUID().toString())
                    .correlationId(correlationId)
                    .status(NotificationStatus.FAILED)
                    .errorMessage(e.getMessage())
                    .message("Failed to send email notification")
                    .build();
        }
    }

    /**
     * Save notification event
     */
    @Transactional
    public NotificationEvent saveEvent(NotificationEvent event) {
        if (event.getCorrelationId() == null) {
            event.setCorrelationId(UUID.randomUUID().toString());
        }
        event.setStatus(NotificationStatus.PENDING);
        event.setRetryCount(0);
        return eventRepository.save(event);
    }

    /**
     * Save multiple events
     */
    @Transactional
    public List<NotificationEvent> saveAllEvents(List<NotificationEvent> events) {
        events.forEach(event -> {
            if (event.getCorrelationId() == null) {
                event.setCorrelationId(UUID.randomUUID().toString());
            }
            event.setStatus(NotificationStatus.PENDING);
            event.setRetryCount(0);
        });
        return eventRepository.saveAll(events);
    }

    // ============= QUERY METHODS =============

    public List<NotificationEvent> getAllEvents() {
        return eventRepository.findAll();
    }

    public Page<NotificationEvent> getAllEvents(Pageable pageable) {
        return eventRepository.findAll(pageable);
    }

    public List<NotificationEvent> getEventsByStatus(NotificationStatus status) {
        return eventRepository.findByStatus(status);
    }

    public Page<NotificationEvent> getEventsByStatus(NotificationStatus status, Pageable pageable) {
        return eventRepository.findByStatus(status, pageable);
    }

    public List<NotificationEvent> getEventsByEventType(EventType eventType) {
        return eventRepository.findByEventType(eventType);
    }

    public Page<NotificationEvent> getEventsByEventType(EventType eventType, Pageable pageable) {
        return eventRepository.findByEventType(eventType, pageable);
    }

    public NotificationEvent getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification event not found with id: " + id));
    }

    public NotificationEvent getEventByCorrelationId(String correlationId) {
        return eventRepository.findByCorrelationId(correlationId)
                .orElseThrow(() -> new RuntimeException("Notification event not found with correlationId: " + correlationId));
    }

    public List<NotificationEvent> getEventsBySourceService(String sourceService) {
        return eventRepository.findBySourceService(sourceService);
    }

    public List<NotificationEvent> getEventsByDateRange(LocalDateTime start, LocalDateTime end) {
        return eventRepository.findByCreatedAtBetween(start, end);
    }

    public List<NotificationEvent> getPendingEventsForRetry() {
        // Fix: Use the correct method signature with List of statuses
        List<NotificationStatus> statuses = Arrays.asList(NotificationStatus.PENDING, NotificationStatus.FAILED);
        return eventRepository.findEventsToRetry(statuses, 3);
    }

    public List<NotificationEvent> getFailedEventsForRetry() {
        // Fix: Use the correct method signature with List of statuses
        List<NotificationStatus> statuses = Arrays.asList(NotificationStatus.FAILED);
        return eventRepository.findEventsToRetry(statuses, 3);
    }

    // ============= UPDATE METHODS =============

    @Transactional
    public NotificationEvent updateEventStatus(Long eventId, NotificationStatus status) {
        NotificationEvent event = getEventById(eventId);

        // Use helper methods where appropriate
        if (status == NotificationStatus.PROCESSING) {
            event.markAsProcessing();
        } else if (status == NotificationStatus.COMPLETED) {
            event.markAsCompleted();
        } else if (status == NotificationStatus.FAILED) {
            event.markAsFailed("Status updated to FAILED");
        } else {
            event.setStatus(status);
        }

        event.setUpdatedAt(LocalDateTime.now());
        return eventRepository.save(event);
    }

    @Transactional
    public NotificationEvent updateEventStatus(String correlationId, NotificationStatus status) {
        NotificationEvent event = getEventByCorrelationId(correlationId);
        return updateEventStatus(event.getId(), status);
    }

    @Transactional
    public NotificationEvent incrementRetryCount(Long eventId) {
        NotificationEvent event = getEventById(eventId);
        // Fix: Use helper method instead of manual increment
        event.incrementRetryCount();
        event.setUpdatedAt(LocalDateTime.now());
        return eventRepository.save(event);
    }

    @Transactional
    public NotificationEvent updateEventPayload(Long eventId, Map<String, Object> payload) {
        NotificationEvent event = getEventById(eventId);
        event.setPayload(payload);
        event.setUpdatedAt(LocalDateTime.now());
        return eventRepository.save(event);
    }

    // ============= DELETE METHODS =============

    @Transactional
    public void deleteEvent(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new RuntimeException("Notification event not found with id: " + eventId);
        }
        eventRepository.deleteById(eventId);
    }

    @Transactional
    public void deleteEventsByCorrelationId(String correlationId) {
        NotificationEvent event = getEventByCorrelationId(correlationId);
        eventRepository.delete(event);
    }

    @Transactional
    public void deleteOldEvents(LocalDateTime beforeDate) {
        // Fix: Use the repository's delete method instead of find+delete
        eventRepository.deleteOldEvents(beforeDate);
        log.info("Deleted old events before {}", beforeDate);
    }

    // ============= STATISTICS =============

    public Map<String, Object> getNotificationStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEvents", eventRepository.count());
        stats.put("pendingEvents", eventRepository.countByStatus(NotificationStatus.PENDING));
        stats.put("processingEvents", eventRepository.countByStatus(NotificationStatus.PROCESSING));
        stats.put("sentEvents", eventRepository.countByStatus(NotificationStatus.SENT));
        stats.put("failedEvents", eventRepository.countByStatus(NotificationStatus.FAILED));
        stats.put("completedEvents", eventRepository.countByStatus(NotificationStatus.COMPLETED));
        // Fix: Use the correct method names
        stats.put("eventsByType", getEventCountByType());
        stats.put("eventsBySource", getEventCountBySource());
        return stats;
    }

    public long getEventCountByStatus(NotificationStatus status) {
        return eventRepository.countByStatus(status);
    }

    public Map<EventType, Long> getEventCountByType() {
        // Fix: Use the correct method name
        List<Object[]> results = eventRepository.countByEventTypeForDashboard();
        Map<EventType, Long> countMap = new HashMap<>();
        for (Object[] result : results) {
            if (result.length >= 2 && result[0] != null) {
                countMap.put((EventType) result[0], (Long) result[1]);
            }
        }
        return countMap;
    }

    public Map<String, Long> getEventCountBySource() {
        // Fix: Use the correct method name
        List<Object[]> results = eventRepository.countBySourceServiceForDashboard();
        Map<String, Long> countMap = new HashMap<>();
        for (Object[] result : results) {
            if (result.length >= 2 && result[0] != null) {
                countMap.put((String) result[0], (Long) result[1]);
            }
        }
        return countMap;
    }
}
/*

package com.major.notification_service.service;

import com.major.notification_service.dto.EmailRequestDTO;
import com.major.notification_service.dto.NotificationResponseDTO;
import com.major.notification_service.model.NotificationEvent;
import com.major.notification_service.model.enums.EventType;
import com.major.notification_service.model.enums.NotificationStatus;
import com.major.notification_service.repository.NotificationEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;
    private final NotificationEventRepository eventRepository;


    // * Send email notification

    public NotificationResponseDTO sendEmailNotification(EmailRequestDTO request) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Processing email notification request with correlationId: {}", correlationId);

        try {
            emailService.sendEmail(request);

            return NotificationResponseDTO.builder()
                    .notificationId(UUID.randomUUID().toString())
                    .correlationId(correlationId)
                    .status(NotificationStatus.SENT)
                    .sentAt(LocalDateTime.now())
                    .message("Email notification sent successfully")
                    .build();

        } catch (Exception e) {
            log.error("Failed to send email notification: {}", e.getMessage());

            return NotificationResponseDTO.builder()
                    .notificationId(UUID.randomUUID().toString())
                    .correlationId(correlationId)
                    .status(NotificationStatus.FAILED)
                    .errorMessage(e.getMessage())
                    .message("Failed to send email notification")
                    .build();
        }
    }

//     * Save notification event

    @Transactional
    public NotificationEvent saveEvent(NotificationEvent event) {
        if (event.getCorrelationId() == null) {
            event.setCorrelationId(UUID.randomUUID().toString());
        }
        event.setStatus(NotificationStatus.PENDING);
        event.setRetryCount(0);
        return eventRepository.save(event);
    }

    // Save multiple events

    @Transactional
    public List<NotificationEvent> saveAllEvents(List<NotificationEvent> events) {
        events.forEach(event -> {
            if (event.getCorrelationId() == null) {
                event.setCorrelationId(UUID.randomUUID().toString());
            }
            event.setStatus(NotificationStatus.PENDING);
            event.setRetryCount(0);
        });
        return eventRepository.saveAll(events);
    }

    // ============= QUERY METHODS =============

    public List<NotificationEvent> getAllEvents() {
        return eventRepository.findAll();
    }

    public Page<NotificationEvent> getAllEvents(Pageable pageable) {
        return eventRepository.findAll(pageable);
    }

    public List<NotificationEvent> getEventsByStatus(NotificationStatus status) {
        return eventRepository.findByStatus(status);
    }

    public Page<NotificationEvent> getEventsByStatus(NotificationStatus status, Pageable pageable) {
        return eventRepository.findByStatus(status, pageable);
    }

    public List<NotificationEvent> getEventsByEventType(EventType eventType) {
        return eventRepository.findByEventType(eventType);
    }

    public Page<NotificationEvent> getEventsByEventType(EventType eventType, Pageable pageable) {
        return eventRepository.findByEventType(eventType, pageable);
    }

    public NotificationEvent getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification event not found with id: " + id));
    }

    public NotificationEvent getEventByCorrelationId(String correlationId) {
        return eventRepository.findByCorrelationId(correlationId)
                .orElseThrow(() -> new RuntimeException("Notification event not found with correlationId: " + correlationId));
    }

    public List<NotificationEvent> getEventsBySourceService(String sourceService) {
        return eventRepository.findBySourceService(sourceService);
    }

    public List<NotificationEvent> getEventsByDateRange(LocalDateTime start, LocalDateTime end) {
        return eventRepository.findByCreatedAtBetween(start, end);
    }

    public List<NotificationEvent> getPendingEventsForRetry() {
        LocalDateTime retryThreshold = LocalDateTime.now().minusMinutes(5);
        return eventRepository.findEventsToRetry(NotificationStatus.PENDING, retryThreshold);
    }

    public List<NotificationEvent> getFailedEventsForRetry() {
        LocalDateTime retryThreshold = LocalDateTime.now().minusMinutes(10);
        return eventRepository.findEventsToRetry(NotificationStatus.FAILED, retryThreshold);
    }

    // ============= UPDATE METHODS =============

    @Transactional
    public NotificationEvent updateEventStatus(Long eventId, NotificationStatus status) {
        NotificationEvent event = getEventById(eventId);
        event.setStatus(status);
        event.setUpdatedAt(LocalDateTime.now());

        if (status == NotificationStatus.SENT || status == NotificationStatus.COMPLETED) {
            event.setCompletedAt(LocalDateTime.now());
        } else if (status == NotificationStatus.PROCESSING) {
            event.setProcessedAt(LocalDateTime.now());
        }

        return eventRepository.save(event);
    }

    @Transactional
    public NotificationEvent updateEventStatus(String correlationId, NotificationStatus status) {
        NotificationEvent event = getEventByCorrelationId(correlationId);
        return updateEventStatus(event.getId(), status);
    }

    @Transactional
    public NotificationEvent incrementRetryCount(Long eventId) {
        NotificationEvent event = getEventById(eventId);
        event.setRetryCount(event.getRetryCount() + 1);
        event.setUpdatedAt(LocalDateTime.now());
        return eventRepository.save(event);
    }

    @Transactional
    public NotificationEvent updateEventPayload(Long eventId, Map<String, Object> payload) {
        NotificationEvent event = getEventById(eventId);
        event.setPayload(payload);
        event.setUpdatedAt(LocalDateTime.now());
        return eventRepository.save(event);
    }

    // ============= DELETE METHODS =============

    @Transactional
    public void deleteEvent(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new RuntimeException("Notification event not found with id: " + eventId);
        }
        eventRepository.deleteById(eventId);
    }

    @Transactional
    public void deleteEventsByCorrelationId(String correlationId) {
        NotificationEvent event = getEventByCorrelationId(correlationId);
        eventRepository.delete(event);
    }

    @Transactional
    public void deleteOldEvents(LocalDateTime beforeDate) {
        List<NotificationEvent> oldEvents = eventRepository.findByCreatedAtBefore(beforeDate);
        eventRepository.deleteAll(oldEvents);
        log.info("Deleted {} old events", oldEvents.size());
    }

    // ============= STATISTICS =============

    public Map<String, Object> getNotificationStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEvents", eventRepository.count());
        stats.put("pendingEvents", eventRepository.countByStatus(NotificationStatus.PENDING));
        stats.put("processingEvents", eventRepository.countByStatus(NotificationStatus.PROCESSING));
        stats.put("sentEvents", eventRepository.countByStatus(NotificationStatus.SENT));
        stats.put("failedEvents", eventRepository.countByStatus(NotificationStatus.FAILED));
        stats.put("completedEvents", eventRepository.countByStatus(NotificationStatus.COMPLETED));
        stats.put("eventsByType", eventRepository.countByEventType());
        stats.put("eventsBySource", eventRepository.countBySourceService());
        return stats;
    }

    public long getEventCountByStatus(NotificationStatus status) {
        return eventRepository.countByStatus(status);
    }

    public Map<EventType, Long> getEventCountByType() {
        List<Object[]> results = eventRepository.countByEventType();
        Map<EventType, Long> countMap = new HashMap<>();
        for (Object[] result : results) {
            countMap.put((EventType) result[0], (Long) result[1]);
        }
        return countMap;
    }
}


 */