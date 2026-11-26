using System.ComponentModel.DataAnnotations;

namespace ERP.Api.DTOs
{
    public class CreateOrderDto
    {
        [Required]
        public Guid CustomerId { get; set; }

        [Required]
        [MinLength(1)]
        public List<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();

        public Guid? WarehouseId { get; set; }

        public bool IsQuotation { get; set; } = false;
    }

    public class OrderItemDto
    {
        [Required]
        public Guid ProductId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }
    }
}
