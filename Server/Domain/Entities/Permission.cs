using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class Permission
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Module { get; set; } = string.Empty;

        [MaxLength(255)]
        public string Description { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class UserPermission
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid UserId { get; set; }
        public User? User { get; set; }

        public Guid PermissionId { get; set; }
        public Permission? Permission { get; set; }

        public Guid? GrantedByUserId { get; set; }

        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    }

    // SodConflict: يعرّف الأزواج المتعارضة من الصلاحيات (Segregation of Duties)
    // مثال: "Create Purchase Order" + "Approve Requests" = تعارض
    public class SodConflict
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string PermissionA { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string PermissionB { get; set; } = string.Empty;

        [MaxLength(255)]
        public string Reason { get; set; } = string.Empty;
    }
}
