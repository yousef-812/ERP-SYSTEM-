namespace ERP.Api.Domain.Entities
{
    public enum WorkflowStatus
    {
        Draft,
        Pending,
        Approved,
        Rejected,
        Cancelled
    }

    public enum StepApprovalMode
    {
        Any,      // First one wins
        All,      // Everyone must approve
        Threshold // Amount-based (future use)
    }

    public enum WorkflowAction
    {
        Submit,
        Approve,
        Reject,
        Cancel,
        RequestInput
    }
}
