using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ERP.Api.Domain.Entities
{
    public enum TransferStatus
    {
        Pending,
        Shipped,
        Received,
        Cancelled
    }

    public class WarehouseTransfer
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(20)]
        public string TransferNumber { get; set; } = string.Empty;

        public Guid FromWarehouseId { get; set; }
        public Warehouse? FromWarehouse { get; set; }

        public Guid ToWarehouseId { get; set; }
        public Warehouse? ToWarehouse { get; set; }

        public DateTime TransferDate { get; set; } = DateTime.UtcNow;

        [Required]
        public TransferStatus Status { get; set; } = TransferStatus.Pending;

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime? ShippedAt { get; set; }
        public DateTime? ReceivedAt { get; set; }

        public Guid CreatedById { get; set; }
        public User? CreatedBy { get; set; }

        public List<WarehouseTransferItem> Items { get; set; } = new();
    }

    public class WarehouseTransferItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WarehouseTransferId { get; set; }
        
        [JsonIgnore]
        public WarehouseTransfer? WarehouseTransfer { get; set; }

        public Guid ProductId { get; set; }
        public Product? Product { get; set; }

        public int Quantity { get; set; }
    }
}
