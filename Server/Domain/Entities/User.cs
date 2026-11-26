using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Role { get; set; } = "Staff";

        [MaxLength(100)]
        public string? JobTitle { get; set; }

        // SecurityStamp: يتغير كل ما تتغير الصلاحيات أو الكلمة السرية
        // أي JWT يحمل stamp قديم يُرفض تلقائيًا — هذا يحل مشكلة الـ 7 أيام
        public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLoginAt { get; set; }
    }
}
