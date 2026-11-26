using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ERP.Api.Domain.Entities
{
    public class PurchaseOrder
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(20)]
        public string PONumber { get; set; } = string.Empty;

        public Guid SupplierId { get; set; }
        public Supplier? Supplier { get; set; }

        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [MaxLength(20)]
        public string Status { get; set; } = "Draft"; // Draft, Approved, Received, Cancelled

        public decimal TotalAmount { get; set; }

        public List<PurchaseOrderDetail> Details { get; set; } = new();

        [MaxLength(500)]
        public string Notes { get; set; } = string.Empty;

        public DateTime? ReceivedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PurchaseOrderDetail
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid PurchaseOrderId { get; set; }
        
        [JsonIgnore]
        public PurchaseOrder? PurchaseOrder { get; set; }

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice => Quantity * UnitPrice;
    }
}
