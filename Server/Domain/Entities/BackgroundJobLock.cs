using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class BackgroundJobLock
    {
        [Key]
        [MaxLength(100)]
        public string JobName { get; set; } = string.Empty; // e.g., "EnterpriseWorker"

        public DateTime LastRunDate { get; set; } = DateTime.MinValue;
        
        public DateTime? LockedUntil { get; set; } // For semaphore safety

        [MaxLength(100)]
        public string? LockedByInstance { get; set; } // Server Name / Instance ID
    }
}
