using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class DeliveryNote
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(20)]
        public string NoteNumber { get; set; } = string.Empty;

        public Guid OrderId { get; set; }
        public Order? Order { get; set; }

        public DateTime ShippedDate { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Shipped"; // Shipped, In-Transit, Delivered, Cancelled

        [MaxLength(500)]
        public string RecipientName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string ShippingAddress { get; set; } = string.Empty;

        public DateTime? DeliveredAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
