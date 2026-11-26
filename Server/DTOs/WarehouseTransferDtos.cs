using System;
using System.Collections.Generic;
using ERP.Api.Domain.Entities;

namespace ERP.Api.DTOs
{
    public class CreateWarehouseTransferDto
    {
        public Guid FromWarehouseId { get; set; }
        public Guid ToWarehouseId { get; set; }
        public string? Notes { get; set; }
        public List<CreateWarehouseTransferItemDto> Items { get; set; } = new();
    }

    public class CreateWarehouseTransferItemDto
    {
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class WarehouseTransferResponseDto
    {
        public Guid Id { get; set; }
        public string TransferNumber { get; set; } = string.Empty;
        public Guid FromWarehouseId { get; set; }
        public string FromWarehouseName { get; set; } = string.Empty;
        public Guid ToWarehouseId { get; set; }
        public string ToWarehouseName { get; set; } = string.Empty;
        public DateTime TransferDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime? ShippedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public List<WarehouseTransferItemDto> Items { get; set; } = new();
    }

    public class WarehouseTransferItemDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }
}
