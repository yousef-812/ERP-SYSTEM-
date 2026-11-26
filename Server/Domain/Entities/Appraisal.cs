using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Appraisal
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        public DateTime ReviewDate { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, In Progress, Completed

        public double Rating { get; set; } // 1.0 to 5.0
        
        public int Score { get; set; } // 0 to 100

        [MaxLength(1000)]
        public string? Comments { get; set; }
    }
}
