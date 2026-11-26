using System;
using System.Collections.Generic;

namespace ERP.Api.DTOs
{
    public class CreatePurchaseOrderDto
    {
        public Guid SupplierId { get; set; }
        public Guid WarehouseId { get; set; }
        public DateTime OrderDate { get; set; }
        public List<CreatePurchaseOrderDetailDto> Details { get; set; } = new();
    }

    public class CreatePurchaseOrderDetailDto
    {
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
    }
}
