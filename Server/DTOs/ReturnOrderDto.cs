using System;
using System.Collections.Generic;

namespace ERP.Api.DTOs
{
    public class ReturnOrderDto
    {
        public Guid OrderId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public List<ReturnItemDto> Items { get; set; } = new();
    }

    public class ReturnItemDto
    {
        public Guid ProductId { get; set; }
        public int ReturnQuantity { get; set; }
    }
}
