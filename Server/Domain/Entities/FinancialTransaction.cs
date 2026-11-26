using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum TransactionType
    {
        Revenue,
        Expense
    }

    public class FinancialTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public TransactionType Type { get; set; }

        public decimal Amount { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Category { get; set; } = "General";

        public Guid? RelatedEntityId { get; set; }
        
        public Guid? WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
