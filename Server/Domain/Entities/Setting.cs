using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Setting
    {
        [Key]
        public string Key { get; set; } = string.Empty;
        
        [Required]
        public string Value { get; set; } = string.Empty;
        
        public string? Description { get; set; }
        
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
