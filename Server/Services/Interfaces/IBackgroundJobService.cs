namespace ERP.Api.Services.Interfaces
{
    public interface IBackgroundJobService
    {
        Task RunEnterpriseJobsAsync(string instanceId);
    }
}
