using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class AuditLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty; // e.g., Create, Update, Delete, Login

        [Required]
        [MaxLength(100)]
        public string EntityName { get; set; } = string.Empty; // e.g., Invoice, Product, Employee

        public string? EntityId { get; set; }

        public string? Details { get; set; } // JSON or description of changes

        public string? IPAddress { get; set; }

        public string? ReasonCode { get; set; } // Enterprise: Why was an override done?
        public string? ApproverId { get; set; } // Enterprise: Who approved the bypass?

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
