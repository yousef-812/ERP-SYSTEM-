using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum OrderStatus
    {
        Pending,
        Paid,
        Cancelled,
        Shipped,
        Returned,
        Quotation,
        Backordered,
        PartiallyFulfilled
    }

    public class Order
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [Range(0, double.MaxValue)]
        public decimal TotalAmount { get; set; }

        public decimal TaxAmount { get; set; }

        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        public DateTime? ReturnDate { get; set; }
        
        [MaxLength(500)]
        public string? ReturnReason { get; set; }

        // Quotations & Lifecycle
        public bool IsQuotation { get; set; } = false;
        public string? QuotationNumber { get; set; }
        public DateTime? ValidUntil { get; set; }

        // Backorders
        public Guid? ParentOrderId { get; set; } // For split orders
        public Order? ParentOrder { get; set; }

        public List<OrderDetail> Details { get; set; } = new();
        
        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
