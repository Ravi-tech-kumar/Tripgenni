package com.major.notification_service.exception;

import lombok.Getter;

@Getter
public class EmailSendException extends RuntimeException {

    private final String recipient;
    private final String emailType;
    private final Integer retryCount;

    public EmailSendException(String message) {
        super(message);
        this.recipient = null;
        this.emailType = null;
        this.retryCount = null;
    }

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
        this.recipient = null;
        this.emailType = null;
        this.retryCount = null;
    }

    public EmailSendException(String message, String recipient, String emailType) {
        super(message);
        this.recipient = recipient;
        this.emailType = emailType;
        this.retryCount = null;
    }

    public EmailSendException(String message, String recipient, String emailType, Integer retryCount) {
        super(message);
        this.recipient = recipient;
        this.emailType = emailType;
        this.retryCount = retryCount;
    }

    public EmailSendException(String message, Throwable cause, String recipient, String emailType) {
        super(message, cause);
        this.recipient = recipient;
        this.emailType = emailType;
        this.retryCount = null;
    }

    // Factory methods
    public static EmailSendException invalidEmail(String recipient) {
        return new EmailSendException(
                "Invalid email address: " + recipient,
                recipient,
                null
        );
    }

    public static EmailSendException smtpError(String recipient, String message) {
        return new EmailSendException(
                "SMTP error: " + message,
                recipient,
                null
        );
    }

    public static EmailSendException templateNotFound(String templateName) {
        return new EmailSendException(
                "Email template not found: " + templateName,
                null,
                null
        );
    }

    public static EmailSendException maxRetriesExceeded(String recipient, String emailType, int retryCount) {
        return new EmailSendException(
                "Maximum retry attempts (" + retryCount + ") exceeded for email type: " + emailType,
                recipient,
                emailType,
                retryCount
        );
    }

    public static EmailSendException attachmentError(String fileName) {
        return new EmailSendException(
                "Failed to process attachment: " + fileName,
                null,
                null
        );
    }
}