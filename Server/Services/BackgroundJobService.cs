using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services.Interfaces;

namespace ERP.Api.Services
{
    public class BackgroundJobService : IBackgroundJobService
    {
        private readonly AppDbContext _context;
        private readonly INotificationService _notification;
        private readonly IAuditLogService _auditLog;
        private readonly ILogger<BackgroundJobService> _logger;

        public BackgroundJobService(AppDbContext context, INotificationService notification, IAuditLogService auditLog, ILogger<BackgroundJobService> logger)
        {
            _context = context;
            _notification = notification;
            _auditLog = auditLog;
            _logger = logger;
        }

        public async Task RunEnterpriseJobsAsync(string instanceId)
        {
            // Acquire Lock (DB-level semaphore)
            var jobLock = await _context.BackgroundJobLocks.FirstOrDefaultAsync(l => l.JobName == "EnterpriseWorker");
            if (jobLock == null) return;

            // If it's a manual trigger (instanceId from Controller), we might want to bypass,
            // but for safety, we keep the lock.
            if (jobLock.LockedUntil > DateTime.UtcNow && jobLock.LockedByInstance != instanceId)
            {
                _logger.LogInformation("Job 'EnterpriseWorker' already locked by instance {Instance}. Skipping.", jobLock.LockedByInstance);
                return;
            }

            // Lock it
            jobLock.LockedUntil = DateTime.UtcNow.AddMinutes(15);
            jobLock.LockedByInstance = instanceId;
            await _context.SaveChangesAsync();

            try
            {
                // Job A: Overdue Invoices
                await ProcessOverdueInvoices();

                // Job B: Low Stock Alerts (once daily or on manual trigger)
                if (DateTime.UtcNow.Subtract(jobLock.LastRunDate).TotalHours >= 24 || instanceId == "ManualTrigger")
                {
                    await ProcessLowStockAlerts();
                }

                // Update Last Run
                jobLock.LastRunDate = DateTime.UtcNow;
                await _auditLog.LogAsync("System", "BackgroundJobs", "EnterpriseWorker", instanceId, "Successfully processed maintenance tasks.");
                await _context.SaveChangesAsync();
            }
            finally
            {
                // Release Lock
                jobLock.LockedUntil = null;
                jobLock.LockedByInstance = null;
                await _context.SaveChangesAsync();
            }
        }

        private async Task ProcessOverdueInvoices()
        {
            var today = DateTime.UtcNow;
            var overdue = await _context.Invoices
                .Include(i => i.Order)
                .Where(i => i.PaymentStatus != PaymentStatus.Paid && i.DueDate < today)
                .ToListAsync();

            foreach (var inv in overdue)
            {
                await _notification.NotifyRoleAsync("Admin", "Workflow_Rejected", $"Invoice #{inv.InvoiceNumber} OVERDUE ({inv.TotalAmountInclTax})", NotificationType.Financial, NotificationSeverity.Critical, "/invoices");
            }
        }

        private async Task ProcessLowStockAlerts()
        {
            var lowStock = await _context.Products
                .Where(p => p.StockQuantity < p.MinStockLevel)
                .ToListAsync();

            foreach (var prod in lowStock)
            {
                await _notification.NotifyRoleAsync("Admin", "Stock_Low", $"Low Stock: {prod.Name} ({prod.StockQuantity})", NotificationType.Inventory, NotificationSeverity.Warning, "/products");
            }
        }
    }
}
