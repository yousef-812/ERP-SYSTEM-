using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class GoodsReceivedNote
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(20)]
        public string GRNNumber { get; set; } = string.Empty;

        [Required]
        public Guid PurchaseOrderId { get; set; }
        public PurchaseOrder? PurchaseOrder { get; set; }

        public DateTime ReceivedDate { get; set; } = DateTime.UtcNow;

        [Required]
        public Guid ReceivedById { get; set; }
        public Employee? ReceivedBy { get; set; }

        [Required]
        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public string? DeliveryNoteNumber { get; set; }

        public List<GoodsReceivedNoteDetail> Details { get; set; } = new();

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class GoodsReceivedNoteDetail
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid GoodsReceivedNoteId { get; set; }
        public GoodsReceivedNote? GoodsReceivedNote { get; set; }

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public int QuantityReceived { get; set; }
        public int QuantityOrdered { get; set; }

        public decimal UnitCost { get; set; }
    }
}
