using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public enum PaymentStatus
    {
        Unpaid,
        Paid,
        PartiallyPaid
    }

    public class Invoice
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid OrderId { get; set; }
        public Order Order { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string InvoiceNumber { get; set; } = string.Empty;

        public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30); // Default 30 days

        public decimal Amount { get; set; } // Subtotal

        public decimal TaxPercentage { get; set; } = 15.0m;
        public decimal TotalTaxAmount { get; set; }
        public decimal TotalAmountInclTax { get; set; }

        [MaxLength(1000)]
        public string? TlvBase64String { get; set; } // ZATCA QR Data

        public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
