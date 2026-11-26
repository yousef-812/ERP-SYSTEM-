using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class TimeOffRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Vacation"; // Vacation, Sick, Business

        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }

        public int TotalDays { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        [MaxLength(500)]
        public string? Reason { get; set; }

        [MaxLength(500)]
        public string? ManagerNote { get; set; }

        public Guid? ApprovedById { get; set; }
        public User? ApprovedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
