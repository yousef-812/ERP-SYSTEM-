using ERP.Api.Domain.Entities;

namespace ERP.Api.Services.Interfaces
{
    public interface INotificationChannel
    {
        string Name { get; }
        Task SendAsync(Notification notification);
    }
}
