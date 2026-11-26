using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services.Interfaces;

namespace ERP.Api.Services
{
    public class WorkflowService : IWorkflowService
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLog;
        private readonly INotificationService _notification;

        public WorkflowService(AppDbContext context, IAuditLogService auditLog, INotificationService notification)
        {
            _context = context;
            _auditLog = auditLog;
            _notification = notification;
        }

        public async Task<WorkflowInstance> InitiateWorkflowAsync(string workflowName, Guid entityId)
        {
            var definition = await _context.WorkflowDefinitions
                .Include(w => w.Steps)
                .FirstOrDefaultAsync(w => w.Name == workflowName && w.IsActive);

            if (definition == null)
                throw new Exception($"Workflow definition '{workflowName}' not found or inactive.");

            var instance = new WorkflowInstance
            {
                Id = Guid.NewGuid(),
                WorkflowDefinitionId = definition.Id,
                EntityId = entityId,
                CurrentStepSequence = 1,
                Status = WorkflowStatus.Pending,
                StartedAt = DateTime.UtcNow
            };

            _context.WorkflowInstances.Add(instance);
            
            // Log the initiation
            instance.Logs.Add(new WorkflowActionLog
            {
                WorkflowInstanceId = instance.Id,
                StepSequence = 0,
                ActionBy = "System",
                Action = WorkflowAction.Submit,
                Note = "Workflow initiated.",
                ActionDate = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Central Audit Log
            await _auditLog.LogAsync("System", "Initiate", "Workflow", instance.Id.ToString(), $"Workflow '{workflowName}' initiated for entity {entityId}");

            // Notify first step role
            var firstStep = definition.Steps.OrderBy(s => s.Sequence).FirstOrDefault();
            if (firstStep != null)
            {
                await _notification.NotifyRoleAsync(firstStep.RequiredRole, "Workflow_Pending", $"{definition.EntityType} {entityId}", NotificationType.Workflow, NotificationSeverity.Warning, GetEntityLink(definition.EntityType));
            }

            return instance;
        }

        public async Task<WorkflowInstance> ProcessActionAsync(Guid instanceId, WorkflowAction action, string username, string userRole, string? note = null)
        {
            var instance = await _context.WorkflowInstances
                .Include(w => w.WorkflowDefinition)
                    .ThenInclude(d => d.Steps)
                .Include(w => w.Logs)
                .FirstOrDefaultAsync(w => w.Id == instanceId);

            if (instance == null) throw new Exception("Workflow instance not found.");
            if (instance.Status != WorkflowStatus.Pending) throw new Exception("Workflow is not in a pending state.");

            var currentStep = instance.WorkflowDefinition?.Steps
                .OrderBy(s => s.Sequence)
                .FirstOrDefault(s => s.Sequence == instance.CurrentStepSequence);

            if (currentStep == null) throw new Exception("Current workflow step not found.");

            // 1. Permission Check
            if (userRole != "Admin" && currentStep.RequiredRole != userRole)
                throw new UnauthorizedAccessException($"User does not have the required role '{currentStep.RequiredRole}' to perform this action.");

            // 2. Process Action
            if (action == WorkflowAction.Reject)
            {
                instance.Status = WorkflowStatus.Rejected;
                instance.CompletedAt = DateTime.UtcNow;
                // Note: Rejection logic could return to Draft, but let's keep it simple for Stage 1.
            }
            else if (action == WorkflowAction.Approve)
            {
                // Move to next step or complete
                var nextStep = instance.WorkflowDefinition?.Steps
                    .OrderBy(s => s.Sequence)
                    .FirstOrDefault(s => s.Sequence > instance.CurrentStepSequence);

                if (nextStep == null)
                {
                    instance.Status = WorkflowStatus.Approved;
                    instance.CompletedAt = DateTime.UtcNow;
                }
                else
                {
                    instance.CurrentStepSequence = nextStep.Sequence;
                }
            }

            // 3. Log Action
            instance.Logs.Add(new WorkflowActionLog
            {
                WorkflowInstanceId = instance.Id,
                StepSequence = currentStep.Sequence,
                ActionBy = username,
                Action = action,
                Note = note,
                ActionDate = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Central Audit Log
            await _auditLog.LogAsync(username, action.ToString(), "Workflow", instance.Id.ToString(), $"Workflow action {action} by {username} at step {currentStep.Sequence}");

            // Notify relevant parties
            if (instance.Status == WorkflowStatus.Approved)
            {
                // In a real app, notify the creator. For now, system-wide.
                await _notification.NotifyRoleAsync("Admin", "Workflow_Approved", $"{instance.WorkflowDefinition?.EntityType} {instance.EntityId}", NotificationType.Workflow, NotificationSeverity.Info, GetEntityLink(instance.WorkflowDefinition?.EntityType));
            }
            else if (instance.Status == WorkflowStatus.Rejected)
            {
                await _notification.NotifyRoleAsync("Admin", "Workflow_Rejected", $"{instance.WorkflowDefinition?.EntityType} {instance.EntityId}", NotificationType.Workflow, NotificationSeverity.Critical, GetEntityLink(instance.WorkflowDefinition?.EntityType));
            }
            else
            {
                // Notify next step role
                var nextStep = instance.WorkflowDefinition?.Steps
                    .OrderBy(s => s.Sequence)
                    .FirstOrDefault(s => s.Sequence == instance.CurrentStepSequence);
                
                if (nextStep != null)
                {
                    await _notification.NotifyRoleAsync(nextStep.RequiredRole, "Workflow_Pending", $"{instance.WorkflowDefinition?.EntityType} {instance.EntityId}", NotificationType.Workflow, NotificationSeverity.Warning, GetEntityLink(instance.WorkflowDefinition?.EntityType));
                }
            }

            return instance;
        }

        public async Task<WorkflowStatus> GetCurrentStatusAsync(Guid instanceId)
        {
            var instance = await _context.WorkflowInstances.FindAsync(instanceId);
            return instance?.Status ?? WorkflowStatus.Draft;
        }

        private string GetEntityLink(string? entityType)
        {
            return entityType switch
            {
                "PurchaseRequest" => "/purchase-requests",
                "Expense" => "/expenses",
                "TimeOffRequest" => "/hr/time-off",
                "RecruitmentJob" => "/hr/recruitment",
                "Appraisal" => "/hr/appraisals",
                "DamageRequest" => "/inventory/damage",
                _ => "/dashboard"
            };
        }
    }
}
