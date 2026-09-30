package com.major.notification_service.repository;

import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    // ============= FIND BY FIELD METHODS =============
    List<EmailLog> findByUserId(String userId);
    Page<EmailLog> findByUserId(String userId, Pageable pageable);
    List<EmailLog> findByRecipientEmail(String recipientEmail);
    List<EmailLog> findByStatus(NotificationStatus status);
    Page<EmailLog> findByStatus(NotificationStatus status, Pageable pageable);
    List<EmailLog> findByEmailType(EmailType emailType);
    Page<EmailLog> findByEmailType(EmailType emailType, Pageable pageable);
    Optional<EmailLog> findByMessageId(String messageId);

    // ============= COMBINATION METHODS =============
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.emailType = :emailType")
    List<EmailLog> findByUserIdAndEmailType(@Param("userId") String userId,
                                            @Param("emailType") EmailType emailType);

    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.status = :status")
    List<EmailLog> findByUserIdAndStatus(@Param("userId") String userId,
                                         @Param("status") NotificationStatus status);

    @Query("SELECT e FROM EmailLog e WHERE e.recipientEmail = :email AND e.emailType = :type")
    List<EmailLog> findByRecipientAndType(@Param("email") String recipientEmail,
                                          @Param("type") EmailType emailType);

    // ============= DATE RANGE METHODS =============
    @Query("SELECT e FROM EmailLog e WHERE e.sentAt BETWEEN :start AND :end")
    List<EmailLog> findEmailsSentBetween(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end);

    @Query("SELECT e FROM EmailLog e WHERE e.createdAt BETWEEN :start AND :end")
    List<EmailLog> findEmailsCreatedBetween(@Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    @Query("SELECT e FROM EmailLog e WHERE e.sentAt BETWEEN :start AND :end")
    Page<EmailLog> findEmailsSentBetween(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end,
                                         Pageable pageable);

    // ============= PENDING/RETRY METHODS =============
    @Query("SELECT e FROM EmailLog e WHERE e.status = :status AND e.createdAt < :date")
    List<EmailLog> findPendingEmailsOlderThan(@Param("status") NotificationStatus status,
                                              @Param("date") LocalDateTime date);

    @Query("SELECT e FROM EmailLog e WHERE e.status = :status AND e.retryCount < :maxRetries AND e.createdAt > :since")
    List<EmailLog> findEmailsToRetry(@Param("status") NotificationStatus status,
                                     @Param("maxRetries") int maxRetries,
                                     @Param("since") LocalDateTime since);

    @Query("SELECT e FROM EmailLog e WHERE e.status IN ('PENDING', 'FAILED') AND e.retryCount < 3")
    List<EmailLog> findEmailsNeedingRetry();

    // ============= LATEST/TOP METHODS =============
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId ORDER BY e.createdAt DESC")
    List<EmailLog> findLatestByUserId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT e FROM EmailLog e WHERE e.recipientEmail = :email ORDER BY e.createdAt DESC")
    List<EmailLog> findLatestByRecipient(@Param("email") String recipientEmail, Pageable pageable);

    // Yeh method Page return karta hai - safe hai
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.emailType = :type ORDER BY e.createdAt DESC")
    Page<EmailLog> findLatestByUserAndType(@Param("userId") String userId,
                                           @Param("type") EmailType emailType,
                                           Pageable pageable);

    // Native query - sirf latest email laane ke liye
    @Query(value = "SELECT * FROM email_logs WHERE user_id = :userId AND email_type = :type ORDER BY created_at DESC LIMIT 1",
            nativeQuery = true)
    Optional<EmailLog> findTopByUserAndType(@Param("userId") String userId,
                                            @Param("type") String emailType);

    // Standard Spring Data method - pagination ke liye best hai
    Page<EmailLog> findByUserIdAndEmailTypeOrderByCreatedAtDesc(String userId, EmailType emailType, Pageable pageable);

    // ============= COUNT METHODS =============
    long countByStatus(NotificationStatus status);
    long countByEmailType(EmailType emailType);

    @Query("SELECT COUNT(e) FROM EmailLog e WHERE e.status = :status AND e.createdAt BETWEEN :start AND :end")
    long countByStatusAndDateRange(@Param("status") NotificationStatus status,
                                   @Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(e) FROM EmailLog e WHERE DATE(e.sentAt) = CURRENT_DATE")
    long countEmailsSentToday();

    @Query("SELECT e.emailType, COUNT(e) FROM EmailLog e GROUP BY e.emailType")
    List<Object[]> countByEmailTypeGrouped();

    @Query("SELECT e.status, COUNT(e) FROM EmailLog e GROUP BY e.status")
    List<Object[]> countByStatusGrouped();

    // ============= EXISTENCE METHODS =============
    boolean existsByMessageId(String messageId);
    boolean existsByUserIdAndEmailType(String userId, EmailType emailType);

    // ============= DELETE METHODS =============
    @Query("DELETE FROM EmailLog e WHERE e.createdAt < :date")
    void deleteOldLogs(@Param("date") LocalDateTime date);

    void deleteByUserId(String userId);

    @Query("DELETE FROM EmailLog e WHERE e.status = :status AND e.createdAt < :date")
    void deleteByStatusAndOlderThan(@Param("status") NotificationStatus status,
                                    @Param("date") LocalDateTime date);
}
/*
package com.major.notification_service.repository;

import com.major.notification_service.model.EmailLog;
import com.major.notification_service.model.enums.EmailType;
import com.major.notification_service.model.enums.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    // ============= FIND BY FIELD METHODS =============

    // Find email logs by user ID
    List<EmailLog> findByUserId(String userId);

    // Find email logs by user ID with pagination
    Page<EmailLog> findByUserId(String userId, Pageable pageable);

    // Find email logs by recipient email
    List<EmailLog> findByRecipientEmail(String recipientEmail);

    // Find email logs by status
    List<EmailLog> findByStatus(NotificationStatus status);

    // Find email logs by status with pagination
    Page<EmailLog> findByStatus(NotificationStatus status, Pageable pageable);

    // Find email logs by email type
    List<EmailLog> findByEmailType(EmailType emailType);

    // Find email logs by email type with pagination
    Page<EmailLog> findByEmailType(EmailType emailType, Pageable pageable);

    // Find email log by message ID
    Optional<EmailLog> findByMessageId(String messageId);

    // ============= COMBINATION METHODS =============

    // Find by user ID and email type
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.emailType = :emailType")
    List<EmailLog> findByUserIdAndEmailType(@Param("userId") String userId,
                                            @Param("emailType") EmailType emailType);

    // Find by user ID and status
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.status = :status")
    List<EmailLog> findByUserIdAndStatus(@Param("userId") String userId,
                                         @Param("status") NotificationStatus status);

    // Find by recipient email and email type
    @Query("SELECT e FROM EmailLog e WHERE e.recipientEmail = :email AND e.emailType = :type")
    List<EmailLog> findByRecipientAndType(@Param("email") String recipientEmail,
                                          @Param("type") EmailType emailType);

    // ============= DATE RANGE METHODS =============

    // Find emails sent between dates
    @Query("SELECT e FROM EmailLog e WHERE e.sentAt BETWEEN :start AND :end")
    List<EmailLog> findEmailsSentBetween(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end);

    // Find emails created between dates
    @Query("SELECT e FROM EmailLog e WHERE e.createdAt BETWEEN :start AND :end")
    List<EmailLog> findEmailsCreatedBetween(@Param("start") LocalDateTime start,
                                            @Param("end") LocalDateTime end);

    // Find emails by date range with pagination
    @Query("SELECT e FROM EmailLog e WHERE e.sentAt BETWEEN :start AND :end")
    Page<EmailLog> findEmailsSentBetween(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end,
                                         Pageable pageable);

    // ============= PENDING/RETRY METHODS =============

    // Find pending emails older than given date
    @Query("SELECT e FROM EmailLog e WHERE e.status = :status AND e.createdAt < :date")
    List<EmailLog> findPendingEmailsOlderThan(@Param("status") NotificationStatus status,
                                              @Param("date") LocalDateTime date);

    // Find failed emails for retry (retry count < max retries)
    @Query("SELECT e FROM EmailLog e WHERE e.status = :status AND e.retryCount < :maxRetries AND e.createdAt > :since")
    List<EmailLog> findEmailsToRetry(@Param("status") NotificationStatus status,
                                     @Param("maxRetries") int maxRetries,
                                     @Param("since") LocalDateTime since);

    // Find emails that need retry (failed/pending with retry count < 3)
    @Query("SELECT e FROM EmailLog e WHERE e.status IN ('PENDING', 'FAILED') AND e.retryCount < 3")
    List<EmailLog> findEmailsNeedingRetry();

    // ============= LATEST/TOP METHODS =============

    // Find latest emails by user
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId ORDER BY e.createdAt DESC")
    List<EmailLog> findLatestByUserId(@Param("userId") String userId, Pageable pageable);

    // Find latest emails by recipient
    @Query("SELECT e FROM EmailLog e WHERE e.recipientEmail = :email ORDER BY e.createdAt DESC")
    List<EmailLog> findLatestByRecipient(@Param("email") String recipientEmail, Pageable pageable);

    // FIXED: Changed return type from Optional<EmailLog> to Page<EmailLog>
    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.emailType = :type ORDER BY e.createdAt DESC")
    Page<EmailLog> findLatestByUserAndType(@Param("userId") String userId,
                                           @Param("type") EmailType emailType,
                                           Pageable pageable);

    // Alternative: Native query for getting single latest email
    @Query(value = "SELECT * FROM email_logs WHERE user_id = :userId AND email_type = :type ORDER BY created_at DESC LIMIT 1",
            nativeQuery = true)
    Optional<EmailLog> findTopByUserAndType(@Param("userId") String userId,
                                            @Param("type") String emailType);

    // ============= PAGINATION METHODS FOR USER AND TYPE =============

    // ADD THIS: Standard Spring Data method for pagination with user and type
    Page<EmailLog> findByUserIdAndEmailTypeOrderByCreatedAtDesc(String userId, EmailType emailType, Pageable pageable);

    // ============= COUNT METHODS =============

    // Count by status
    long countByStatus(NotificationStatus status);

    // Count by email type
    long countByEmailType(EmailType emailType);

    // Count by status and date range
    @Query("SELECT COUNT(e) FROM EmailLog e WHERE e.status = :status AND e.createdAt BETWEEN :start AND :end")
    long countByStatusAndDateRange(@Param("status") NotificationStatus status,
                                   @Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);

    // Count emails sent today
    @Query("SELECT COUNT(e) FROM EmailLog e WHERE DATE(e.sentAt) = CURRENT_DATE")
    long countEmailsSentToday();

    // Count by email type with grouping
    @Query("SELECT e.emailType, COUNT(e) FROM EmailLog e GROUP BY e.emailType")
    List<Object[]> countByEmailTypeGrouped();

    // Count by status with grouping
    @Query("SELECT e.status, COUNT(e) FROM EmailLog e GROUP BY e.status")
    List<Object[]> countByStatusGrouped();

    // ============= EXISTENCE METHODS =============

    // Check if email log exists by message ID
    boolean existsByMessageId(String messageId);

    // Check if user has received specific email type
    boolean existsByUserIdAndEmailType(String userId, EmailType emailType);

    // ============= DELETE METHODS =============

    // Delete old logs before given date
    @Query("DELETE FROM EmailLog e WHERE e.createdAt < :date")
    void deleteOldLogs(@Param("date") LocalDateTime date);

    // Delete by user ID
    void deleteByUserId(String userId);

    // Delete by status and date
    @Query("DELETE FROM EmailLog e WHERE e.status = :status AND e.createdAt < :date")
    void deleteByStatusAndOlderThan(@Param("status") NotificationStatus status,
                                    @Param("date") LocalDateTime date);
}


*/




//package com.major.notification_service.repository;
//
//import com.major.notification_service.model.EmailLog;
//import com.major.notification_service.model.enums.EmailType;
//import com.major.notification_service.model.enums.NotificationStatus;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;
//import org.springframework.stereotype.Repository;
//
//import java.time.LocalDateTime;
//import java.util.List;
//import java.util.Optional;
//
//@Repository
//public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
//
//    // ============= FIND BY FIELD METHODS =============
//
//    /**
//     * Find email logs by user ID
//     */
//    List<EmailLog> findByUserId(String userId);
//
//    /**
//     * Find email logs by user ID with pagination
//     */
//    Page<EmailLog> findByUserId(String userId, Pageable pageable);
//
//    /**
//     * Find email logs by recipient email
//     */
//    List<EmailLog> findByRecipientEmail(String recipientEmail);
//
//    /**
//     * Find email logs by status
//     */
//    List<EmailLog> findByStatus(NotificationStatus status);
//
//    /**
//     * Find email logs by status with pagination
//     */
//    Page<EmailLog> findByStatus(NotificationStatus status, Pageable pageable);
//
//    /**
//     * Find email logs by email type
//     */
//    List<EmailLog> findByEmailType(EmailType emailType);
//
//    /**
//     * Find email logs by email type with pagination
//     */
//    Page<EmailLog> findByEmailType(EmailType emailType, Pageable pageable);
//
//    /**
//     * Find email log by message ID
//     */
//    Optional<EmailLog> findByMessageId(String messageId);
//
//    // ============= COMBINATION METHODS =============
//
//    /**
//     * Find by user ID and email type
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.emailType = :emailType")
//    List<EmailLog> findByUserIdAndEmailType(@Param("userId") String userId,
//                                            @Param("emailType") EmailType emailType);
//
//    /**
//     * Find by user ID and status
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.status = :status")
//    List<EmailLog> findByUserIdAndStatus(@Param("userId") String userId,
//                                         @Param("status") NotificationStatus status);
//
//    /**
//     * Find by recipient email and email type
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.recipientEmail = :email AND e.emailType = :type")
//    List<EmailLog> findByRecipientAndType(@Param("email") String recipientEmail,
//                                          @Param("type") EmailType emailType);
//
//    // ============= DATE RANGE METHODS =============
//
//    /**
//     * Find emails sent between dates
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.sentAt BETWEEN :start AND :end")
//    List<EmailLog> findEmailsSentBetween(@Param("start") LocalDateTime start,
//                                         @Param("end") LocalDateTime end);
//
//    /**
//     * Find emails created between dates
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.createdAt BETWEEN :start AND :end")
//    List<EmailLog> findEmailsCreatedBetween(@Param("start") LocalDateTime start,
//                                            @Param("end") LocalDateTime end);
//
//    /**
//     * Find emails by date range with pagination
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.sentAt BETWEEN :start AND :end")
//    Page<EmailLog> findEmailsSentBetween(@Param("start") LocalDateTime start,
//                                         @Param("end") LocalDateTime end,
//                                         Pageable pageable);
//
//    // ============= PENDING/RETRY METHODS =============
//
//    /**
//     * Find pending emails older than given date
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.status = :status AND e.createdAt < :date")
//    List<EmailLog> findPendingEmailsOlderThan(@Param("status") NotificationStatus status,
//                                              @Param("date") LocalDateTime date);
//
//    /**
//     * Find failed emails for retry (retry count < max retries)
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.status = :status AND e.retryCount < :maxRetries AND e.createdAt > :since")
//    List<EmailLog> findEmailsToRetry(@Param("status") NotificationStatus status,
//                                     @Param("maxRetries") int maxRetries,
//                                     @Param("since") LocalDateTime since);
//
//    /**
//     * Find emails that need retry (failed/pending with retry count < 3)
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.status IN ('PENDING', 'FAILED') AND e.retryCount < 3")
//    List<EmailLog> findEmailsNeedingRetry();
//
//    // ============= LATEST/TOP METHODS =============
//
//    /**
//     * Find latest emails by user
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId ORDER BY e.createdAt DESC")
//    List<EmailLog> findLatestByUserId(@Param("userId") String userId, Pageable pageable);
//
//    /**
//     * Find latest emails by recipient
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.recipientEmail = :email ORDER BY e.createdAt DESC")
//    List<EmailLog> findLatestByRecipient(@Param("email") String recipientEmail, Pageable pageable);
//
//    /**
//     * Find latest email of specific type for user
//     */
//    @Query("SELECT e FROM EmailLog e WHERE e.userId = :userId AND e.emailType = :type ORDER BY e.createdAt DESC")
//    Optional<EmailLog> findLatestByUserAndType(@Param("userId") String userId,
//                                               @Param("type") EmailType emailType,
//                                               Pageable pageable);
//
//    // ============= COUNT METHODS =============
//
//    /**
//     * Count by status
//     */
//    long countByStatus(NotificationStatus status);
//
//    /**
//     * Count by email type
//     */
//    long countByEmailType(EmailType emailType);
//
//    /**
//     * Count by status and date range
//     */
//    @Query("SELECT COUNT(e) FROM EmailLog e WHERE e.status = :status AND e.createdAt BETWEEN :start AND :end")
//    long countByStatusAndDateRange(@Param("status") NotificationStatus status,
//                                   @Param("start") LocalDateTime start,
//                                   @Param("end") LocalDateTime end);
//
//    /**
//     * Count emails sent today
//     */
//    @Query("SELECT COUNT(e) FROM EmailLog e WHERE DATE(e.sentAt) = CURRENT_DATE")
//    long countEmailsSentToday();
//
//    /**
//     * Count by email type with grouping
//     */
//    @Query("SELECT e.emailType, COUNT(e) FROM EmailLog e GROUP BY e.emailType")
//    List<Object[]> countByEmailTypeGrouped();
//
//    /**
//     * Count by status with grouping
//     */
//    @Query("SELECT e.status, COUNT(e) FROM EmailLog e GROUP BY e.status")
//    List<Object[]> countByStatusGrouped();
//
//    // ============= EXISTENCE METHODS =============
//
//    /**
//     * Check if email log exists by message ID
//     */
//    boolean existsByMessageId(String messageId);
//
//    /**
//     * Check if user has received specific email type
//     */
//    boolean existsByUserIdAndEmailType(String userId, EmailType emailType);
//
//    // ============= DELETE METHODS =============
//
//    /**
//     * Delete old logs before given date
//     */
//    @Query("DELETE FROM EmailLog e WHERE e.createdAt < :date")
//    void deleteOldLogs(@Param("date") LocalDateTime date);
//
//    /**
//     * Delete by user ID
//     */
//    void deleteByUserId(String userId);
//
//    /**
//     * Delete by status and date
//     */
//    @Query("DELETE FROM EmailLog e WHERE e.status = :status AND e.createdAt < :date")
//    void deleteByStatusAndOlderThan(@Param("status") NotificationStatus status,
//                                    @Param("date") LocalDateTime date);
//}