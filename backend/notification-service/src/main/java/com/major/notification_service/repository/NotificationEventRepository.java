package com.major.notification_service.repository;

import com.major.notification_service.model.NotificationEvent;
import com.major.notification_service.model.enums.EventType;
import com.major.notification_service.model.enums.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
@Repository
public interface NotificationEventRepository extends JpaRepository<NotificationEvent, Long> {

    // ============= FIND BY FIELD METHODS =============

    /**
     * Find events by event type
     */
    List<NotificationEvent> findByEventType(EventType eventType);

    /**
     * Find events by event type with pagination
     */
    Page<NotificationEvent> findByEventType(EventType eventType, Pageable pageable);

    /**
     * Find events by status
     */
    List<NotificationEvent> findByStatus(NotificationStatus status);

    /**
     * Find events by status with pagination
     */
    Page<NotificationEvent> findByStatus(NotificationStatus status, Pageable pageable);

    /**
     * Find event by correlation ID
     */
    Optional<NotificationEvent> findByCorrelationId(String correlationId);

    /**
     * Find events by source service
     */
    List<NotificationEvent> findBySourceService(String sourceService);

    /**
     * Find events by source service with pagination
     */
    Page<NotificationEvent> findBySourceService(String sourceService, Pageable pageable);

    // ============= COMBINATION METHODS =============

    /**
     * Find by event type and status
     */
    List<NotificationEvent> findByEventTypeAndStatus(EventType eventType, NotificationStatus status);

    /**
     * Find by event type and status with pagination
     */
    Page<NotificationEvent> findByEventTypeAndStatus(EventType eventType, NotificationStatus status, Pageable pageable);

    /**
     * Find by source service and status
     */
    List<NotificationEvent> findBySourceServiceAndStatus(String sourceService, NotificationStatus status);

    /**
     * Find by correlation ID and status
     */
    Optional<NotificationEvent> findByCorrelationIdAndStatus(String correlationId, NotificationStatus status);

    // ============= DATE RANGE METHODS =============

    /**
     * Find events created between dates
     */
    List<NotificationEvent> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Find events created between dates with pagination
     */
    Page<NotificationEvent> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    /**
     * Find events processed between dates
     */
    List<NotificationEvent> findByProcessedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Find events completed between dates
     */
    List<NotificationEvent> findByCompletedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Find events created after date
     */
    List<NotificationEvent> findByCreatedAtAfter(LocalDateTime date);

    /**
     * Find events created before date
     */
    List<NotificationEvent> findByCreatedAtBefore(LocalDateTime date);

    // ============= RETRY METHODS =============

    /**
     * Find events to retry (pending/failed with retry count < max and created before threshold)
     */
    @Query("SELECT e FROM NotificationEvent e WHERE e.status = :status AND e.retryCount < :maxRetries AND e.createdAt < :threshold")
    List<NotificationEvent> findEventsToRetry(@Param("status") NotificationStatus status,
                                              @Param("maxRetries") int maxRetries,
                                              @Param("threshold") LocalDateTime threshold);

    /**
     * Find events to retry with custom parameters
     */
    @Query("SELECT e FROM NotificationEvent e WHERE e.status IN :statuses AND e.retryCount < :maxRetries ORDER BY e.createdAt ASC")
    List<NotificationEvent> findEventsToRetry(@Param("statuses") List<NotificationStatus> statuses,
                                              @Param("maxRetries") int maxRetries);

    /**
     * Find all pending events that need processing
     */
    @Query("SELECT e FROM NotificationEvent e WHERE e.status = 'PENDING' AND e.retryCount < 3")
    List<NotificationEvent> findAllPendingEvents();

    /**
     * Find stuck events (pending for too long)
     */
    @Query("SELECT e FROM NotificationEvent e WHERE e.status = 'PENDING' AND e.createdAt < :stuckThreshold")
    List<NotificationEvent> findStuckEvents(@Param("stuckThreshold") LocalDateTime stuckThreshold);

    // ============= LATEST/RECENT METHODS =============

    /**
     * Find latest events
     */
    List<NotificationEvent> findTop10ByOrderByCreatedAtDesc();

    /**
     * Find latest events by type
     */
    @Query("SELECT e FROM NotificationEvent e WHERE e.eventType = :type ORDER BY e.createdAt DESC")
    List<NotificationEvent> findLatestByEventType(@Param("type") EventType eventType, Pageable pageable);

    /**
     * Find latest events by source
     */
    @Query("SELECT e FROM NotificationEvent e WHERE e.sourceService = :source ORDER BY e.createdAt DESC")
    List<NotificationEvent> findLatestBySourceService(@Param("source") String sourceService, Pageable pageable);

    // ============= COUNT METHODS =============

    /**
     * Count by event type
     */
    long countByEventType(EventType eventType);

    /**
     * Count by status
     */
    long countByStatus(NotificationStatus status);

    /**
     * Count by source service
     */
    long countBySourceService(String sourceService);

    /**
     * Count by event type and status
     */
    long countByEventTypeAndStatus(EventType eventType, NotificationStatus status);

    /**
     * Count by date range
     */
    @Query("SELECT COUNT(e) FROM NotificationEvent e WHERE e.createdAt BETWEEN :start AND :end")
    long countByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Count events created today
     */
    @Query("SELECT COUNT(e) FROM NotificationEvent e WHERE DATE(e.createdAt) = CURRENT_DATE")
    long countEventsToday();

    /**
     * Count events by status for dashboard
     */
    @Query("SELECT e.status, COUNT(e) FROM NotificationEvent e GROUP BY e.status")
    List<Object[]> countByStatusForDashboard();

    /**
     * Count events by event type for dashboard
     */
    @Query("SELECT e.eventType, COUNT(e) FROM NotificationEvent e GROUP BY e.eventType")
    List<Object[]> countByEventTypeForDashboard();

    /**
     * Count events by source service for dashboard
     */
    @Query("SELECT e.sourceService, COUNT(e) FROM NotificationEvent e GROUP BY e.sourceService")
    List<Object[]> countBySourceServiceForDashboard();

    /**
     * Get daily event counts for last 30 days
     */
    @Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM notification_events " +
            "WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) " +
            "GROUP BY DATE(created_at) ORDER BY date DESC", nativeQuery = true)
    List<Object[]> getDailyEventCounts();

    /**
     * Get hourly event counts for today
     */
    @Query(value = "SELECT HOUR(created_at) as hour, COUNT(*) as count FROM notification_events " +
            "WHERE DATE(created_at) = CURRENT_DATE " +
            "GROUP BY HOUR(created_at) ORDER BY hour", nativeQuery = true)
    List<Object[]> getHourlyEventCounts();

    // ============= STATISTICS METHODS =============

    /**
     * Get success rate by event type
     */
    @Query("SELECT e.eventType, " +
            "SUM(CASE WHEN e.status = 'COMPLETED' THEN 1 ELSE 0 END) as success, " +
            "SUM(CASE WHEN e.status = 'FAILED' THEN 1 ELSE 0 END) as failed, " +
            "COUNT(e) as total " +
            "FROM NotificationEvent e GROUP BY e.eventType")
    List<Object[]> getSuccessRateByEventType();

    /**
     * Get average processing time by event type
     */
    @Query("SELECT e.eventType, AVG(TIMESTAMPDIFF(SECOND, e.createdAt, e.processedAt)) as avgTime " +
            "FROM NotificationEvent e WHERE e.processedAt IS NOT NULL GROUP BY e.eventType")
    List<Object[]> getAvgProcessingTimeByEventType();

    // ============= UPDATE METHODS =============

    /**
     * Update status by correlation ID
     */
    @Modifying
    @Transactional
    @Query("UPDATE NotificationEvent e SET e.status = :status, e.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE e.correlationId = :correlationId")
    int updateStatusByCorrelationId(@Param("correlationId") String correlationId,
                                    @Param("status") NotificationStatus status);

    /**
     * Update status for old pending events
     */
    @Modifying
    @Transactional
    @Query("UPDATE NotificationEvent e SET e.status = 'FAILED', e.errorMessage = :error " +
            "WHERE e.status = 'PENDING' AND e.createdAt < :date")
    int markOldPendingAsFailed(@Param("date") LocalDateTime date,
                               @Param("error") String errorMessage);

    /**
     * Increment retry count
     */
    @Modifying
    @Transactional
    @Query("UPDATE NotificationEvent e SET e.retryCount = e.retryCount + 1, e.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE e.id = :id")
    int incrementRetryCount(@Param("id") Long id);

    // ============= DELETE METHODS =============

    /**
     * Delete events older than given date
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM NotificationEvent e WHERE e.createdAt < :date")
    int deleteOldEvents(@Param("date") LocalDateTime date);

    /**
     * Delete events by status and older than date
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM NotificationEvent e WHERE e.status = :status AND e.createdAt < :date")
    int deleteByStatusAndOlderThan(@Param("status") NotificationStatus status,
                                   @Param("date") LocalDateTime date);

    /**
     * Delete by correlation ID
     */
    @Modifying
    @Transactional
    void deleteByCorrelationId(String correlationId);

    // ============= EXISTS METHODS =============

    /**
     * Check if exists by correlation ID
     */
    boolean existsByCorrelationId(String correlationId);

    /**
     * Check if there are pending events for source
     */
    boolean existsBySourceServiceAndStatus(String sourceService, NotificationStatus status);
}