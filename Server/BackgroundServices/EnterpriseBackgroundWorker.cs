using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services.Interfaces;

namespace ERP.Api.BackgroundServices
{
    public class EnterpriseBackgroundWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EnterpriseBackgroundWorker> _logger;
        private readonly IConfiguration _config;
        private readonly string _instanceId = Guid.NewGuid().ToString().Substring(0, 8);

        public EnterpriseBackgroundWorker(IServiceProvider serviceProvider, ILogger<EnterpriseBackgroundWorker> logger, IConfiguration config)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var intervalHours = _config.GetValue<int>("BackgroundWorker:IntervalHours", 4);
            _logger.LogInformation("Enterprise Background Worker started. Interval: {Hours} hours.", intervalHours);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunJobsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Enterprise Background Worker loop.");
                }

                await Task.Delay(TimeSpan.FromHours(intervalHours), stoppingToken);
            }
        }

        public async Task RunJobsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var jobService = scope.ServiceProvider.GetRequiredService<IBackgroundJobService>();
            
            _logger.LogInformation("Enterprise Worker Instance {Instance} triggered background jobs.", _instanceId);
            await jobService.RunEnterpriseJobsAsync(_instanceId);
        }
    }
}
