using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Warehouse
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? NameEn { get; set; }

        [MaxLength(100)]
        public string Location { get; set; } = "Cairo";

        [MaxLength(100)]
        public string Manager { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public List<StockLevel> StockLevels { get; set; } = new();
    }

    public class StockLevel
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public decimal Quantity { get; set; }
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? BinLocation { get; set; } // Bin #1, Shelf A
    }

    public class InventoryTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "Incoming"; // Incoming, Outgoing, Transfer, Damage, Adjustment, Return

        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? Reference { get; set; } // PO-001, DMG-001

        [MaxLength(500)]
        public string? Note { get; set; }

        // Batches for perishables
        [MaxLength(50)]
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }

        public Guid CreatedById { get; set; }
        public User? CreatedBy { get; set; }
    }
}
