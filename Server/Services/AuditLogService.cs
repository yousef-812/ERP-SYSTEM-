using ERP.Api.Data;
using ERP.Api.Domain.Entities;

namespace ERP.Api.Services
{
    public interface IAuditLogService
    {
        Task LogAsync(string username, string action, string entityName, string entityId, string details = "", string ipAddress = "");
    }

    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _context;

        public AuditLogService(AppDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(string username, string action, string entityName, string entityId, string details = "", string ipAddress = "")
        {
            var log = new AuditLog
            {
                Username = username,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Details = details,
                IPAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };

            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}
