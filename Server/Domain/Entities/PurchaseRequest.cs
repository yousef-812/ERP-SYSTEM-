using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum PurchaseRequestStatus
    {
        Draft,
        PendingApproval,
        Approved,
        Rejected,
        ConvertedToPO
    }

    public class PurchaseRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(20)]
        public string PRNumber { get; set; } = string.Empty;

        [Required]
        public Guid RequestedById { get; set; }
        public Employee? RequestedBy { get; set; }

        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        public PurchaseRequestStatus Status { get; set; } = PurchaseRequestStatus.Draft;

        public decimal TotalEstimatedAmount { get; set; }
        
        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        [MaxLength(500)]
        public string? Justification { get; set; }

        public Guid? WorkflowInstanceId { get; set; }
        public WorkflowInstance? WorkflowInstance { get; set; }

        public List<PurchaseRequestDetail> Details { get; set; } = new();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PurchaseRequestDetail
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid PurchaseRequestId { get; set; }
        public PurchaseRequest? PurchaseRequest { get; set; }

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public int Quantity { get; set; }
        public decimal EstimatedUnitPrice { get; set; }

        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }
    }
}
