using System.ComponentModel.DataAnnotations;

namespace ERP.Api.Domain.Entities
{
    public class WorkflowDefinition
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Purchase Approval"

        [Required]
        [MaxLength(100)]
        public string EntityType { get; set; } = string.Empty; // e.g., "PurchaseRequest"

        public bool IsActive { get; set; } = true;

        public List<WorkflowStep> Steps { get; set; } = new();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class WorkflowStep
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WorkflowDefinitionId { get; set; }
        public WorkflowDefinition? WorkflowDefinition { get; set; }

        public int Sequence { get; set; } // 1, 2, 3...

        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // e.g., "Manager Approval"

        [Required]
        [MaxLength(50)]
        public string RequiredRole { get; set; } = string.Empty; // e.g., "Manager", "CFO"

        public StepApprovalMode ApprovalMode { get; set; } = StepApprovalMode.Any;

        public int TimeoutHours { get; set; } = 48; // Escalation period

        [MaxLength(50)]
        public string? EscalationRole { get; set; } // Next in line if timeout occurs
    }

    public class WorkflowInstance
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WorkflowDefinitionId { get; set; }
        public WorkflowDefinition? WorkflowDefinition { get; set; }

        public Guid EntityId { get; set; } // ID of the PR, Expense, etc.

        public int CurrentStepSequence { get; set; } = 1;

        public WorkflowStatus Status { get; set; } = WorkflowStatus.Draft;

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }

        public List<WorkflowActionLog> Logs { get; set; } = new();
    }

    public class WorkflowActionLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WorkflowInstanceId { get; set; }
        public WorkflowInstance? WorkflowInstance { get; set; }

        public int StepSequence { get; set; }

        [Required]
        public string ActionBy { get; set; } = string.Empty; // Username

        public WorkflowAction Action { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }

        public DateTime ActionDate { get; set; } = DateTime.UtcNow;
    }
}
