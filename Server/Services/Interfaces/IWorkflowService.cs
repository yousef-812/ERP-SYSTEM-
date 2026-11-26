using ERP.Api.Domain.Entities;

namespace ERP.Api.Services.Interfaces
{
    public interface IWorkflowService
    {
        Task<WorkflowInstance> InitiateWorkflowAsync(string workflowName, Guid entityId);
        Task<WorkflowInstance> ProcessActionAsync(Guid instanceId, WorkflowAction action, string username, string userRole, string? note = null);
        Task<WorkflowStatus> GetCurrentStatusAsync(Guid instanceId);
    }
}
