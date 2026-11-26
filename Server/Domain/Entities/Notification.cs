using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum NotificationSeverity
    {
        Info,
        Warning,
        Critical
    }

    public enum NotificationType
    {
        System,
        Workflow,
        Inventory,
        Financial,
        HR
    }

    public class Notification
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid? UserId { get; set; } // Recipient (null for system-wide alerts, though we prefer per-user for 'Read' status)
        public User? User { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty; // Translated from server

        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty; // Translated from server

        public NotificationType Type { get; set; } = NotificationType.System;
        public NotificationSeverity Severity { get; set; } = NotificationSeverity.Info;

        public bool IsRead { get; set; } = false;

        [MaxLength(500)]
        public string? Link { get; set; } // Dashboard deep link

        public string? MetadataJson { get; set; } // Extensible data

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExpiryDate { get; set; } // For 90-day cleanup
    }
}
