using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class DocumentMetadata
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty; // Physical filename on disk

        [Required]
        [MaxLength(255)]
        public string DisplayName { get; set; } = string.Empty; // Name chosen by user

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = "General"; // Finance, HR, System, etc.

        public long FileSize { get; set; }
        
        [MaxLength(50)]
        public string FileExtension { get; set; } = string.Empty;

        public DateTime UploadDate { get; set; } = DateTime.UtcNow;
        
        public Guid? WarehouseId { get; set; }

        [MaxLength(100)]
        public string? UploadedBy { get; set; }
    }
}
