using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services.Interfaces;
using System.Collections.Concurrent;

namespace ERP.Api.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        // Mock translation dictionary for Stage 2
        private readonly Dictionary<string, (string Ar, string En)> _translations = new()
        {
            ["Workflow_Pending"] = ("طلب جديد بانتظار موافقتك", "New request pending your approval"),
            ["Workflow_Approved"] = ("تمت الموافقة على طلبك", "Your request has been approved"),
            ["Workflow_Rejected"] = ("تم رفض طلبك", "Your request has been rejected"),
            ["Stock_Low"] = ("تنبيه: مخزون منخفض", "Warning: Low stock level"),
            ["System_Welcome"] = ("مرحباً بك في نظام ERP المطور", "Welcome to the Enterprise ERP system")
        };

        public NotificationService(AppDbContext context)
        {
            _context = context;
        }

        public async Task NotifyUserAsync(Guid userId, string key, string messageParam, NotificationType type, NotificationSeverity severity = NotificationSeverity.Info, string? link = null)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return;

            // In a real app, check user.PreferredLanguage. For now, we'll provide both or default to Ar.
            var (title, message) = ResolveTranslation(key, messageParam);

            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                Severity = severity,
                Link = link,
                CreatedAt = DateTime.UtcNow,
                ExpiryDate = DateTime.UtcNow.AddDays(90)
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }

        public async Task NotifyRoleAsync(string roleName, string key, string messageParam, NotificationType type, NotificationSeverity severity = NotificationSeverity.Info, string? link = null)
        {
            var users = await _context.Users.Where(u => u.Role == roleName).ToListAsync();
            var notifications = new List<Notification>();

            var (title, message) = ResolveTranslation(key, messageParam);

            foreach (var user in users)
            {
                notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    Title = title,
                    Message = message,
                    Type = type,
                    Severity = severity,
                    Link = link,
                    CreatedAt = DateTime.UtcNow,
                    ExpiryDate = DateTime.UtcNow.AddDays(90)
                });
            }

            if (notifications.Any())
            {
                _context.Notifications.AddRange(notifications);
                await _context.SaveChangesAsync();
            }
        }

        public async Task MarkAsReadAsync(Guid notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification != null)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync();
            }
        }

        public async Task MarkAllAsReadAsync(Guid userId)
        {
            var unread = await _context.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
            foreach (var n in unread)
            {
                n.IsRead = true;
            }
            await _context.SaveChangesAsync();
        }

        private (string Title, string Message) ResolveTranslation(string key, string param)
        {
            if (_translations.TryGetValue(key, out var t))
            {
                // For Stage 2, we'll return a combined string or just Arabic as primary.
                // Enterprise requirement: "اللغه تيجي مترجمه من السيرفر"
                return (t.Ar, $"{t.Ar}: {param}");
            }
            return (key, param); // Fallback
        }
    }
}
