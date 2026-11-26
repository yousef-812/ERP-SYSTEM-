using ERP.Api.Domain.Entities;

namespace ERP.Api.Services.Interfaces
{
    public interface INotificationService
    {
        Task NotifyUserAsync(Guid userId, string title, string message, NotificationType type, NotificationSeverity severity = NotificationSeverity.Info, string? link = null);
        Task NotifyRoleAsync(string roleName, string title, string message, NotificationType type, NotificationSeverity severity = NotificationSeverity.Info, string? link = null);
        Task MarkAsReadAsync(Guid notificationId);
        Task MarkAllAsReadAsync(Guid userId);
    }
}
