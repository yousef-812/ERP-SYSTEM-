using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class DamageRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string RequestNumber { get; set; } = string.Empty; // e.g. DMG-001

        [Required]
        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public int Quantity { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        public DateTime DateReported { get; set; } = DateTime.UtcNow;
    }
}
