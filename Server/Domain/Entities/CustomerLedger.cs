using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum LedgerEntryType
    {
        Invoice,
        Payment,
        CreditNote,
        Refund
    }

    public class CustomerLedger
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

        [Required]
        public LedgerEntryType EntryType { get; set; }

        public decimal Debit { get; set; } // Amount owed by customer
        public decimal Credit { get; set; } // Amount paid by customer

        public decimal BalanceAfter { get; set; }

        public string Description { get; set; } = string.Empty;
        
        public Guid? RelatedEntityId { get; set; } // OrderId or InvoiceId
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
