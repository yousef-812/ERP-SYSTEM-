using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class FinancialPeriod
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public int Year { get; set; }

        [Required]
        [Range(1, 12)]
        public int Month { get; set; }

        public bool IsClosed { get; set; } = false;

        public DateTime? ClosedAt { get; set; }

        [MaxLength(100)]
        public string? ClosedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
