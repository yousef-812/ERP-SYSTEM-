using System;
using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class UserWarehouse
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
