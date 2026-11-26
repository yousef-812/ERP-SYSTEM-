using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Product
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public string Name { get; set; } = string.Empty;
        public string? NameEn { get; set; }

        [Required]
        [MaxLength(50)]
        public string SKU { get; set; } = string.Empty;

        public string? Category { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [MaxLength(100)]
        public string? Barcode { get; set; }

        public int StockQuantity { get; set; }

        public int MinStockLevel { get; set; } = 5;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public Guid? WarehouseId { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public virtual ICollection<StockLevel> StockLevels { get; set; } = new List<StockLevel>();
    }
}
