using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum MovementType
    {
        Receiving,   // In (Purchase from supplier)
        Sale,        // Out (Sold to customer)
        Adjustment,  // Manual (Correction/Damage)
        Return,      // In (Customer return)
        Transfer     // Internal Warehouse Transfer
    }

    public class StockMovement
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public Guid? SupplierId { get; set; }
        public Supplier? Supplier { get; set; }

        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        [Required]
        public int Quantity { get; set; }

        [Range(0, double.MaxValue)]
        public decimal UnitCost { get; set; } // Purchase cost at time of entry

        [Required]
        public MovementType Type { get; set; }

        public DateTime MovementDate { get; set; } = DateTime.UtcNow;

        [MaxLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
