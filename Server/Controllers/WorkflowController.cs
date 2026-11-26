using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using System.Security.Claims;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class WorkflowController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWorkflowService _workflowService;

        public WorkflowController(AppDbContext context, IWorkflowService workflowService)
        {
            _context = context;
            _workflowService = workflowService;
        }

        // POST: api/Workflow/{id}/action
        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/action")]
        public async Task<IActionResult> ProcessAction(Guid id, [FromBody] WorkflowActionDto actionDto)
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "Unknown";

            try
            {
                var instance = await _workflowService.ProcessActionAsync(id, actionDto.Action, username, userRole, actionDto.Note);

                // If approved/rejected, update the linked entity status
                if (instance.Status == WorkflowStatus.Approved || instance.Status == WorkflowStatus.Rejected)
                {
                    await UpdateLinkedEntityStatus(instance);
                }

                return Ok(new { message = "Action processed.", status = instance.Status.ToString() });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private async Task UpdateLinkedEntityStatus(WorkflowInstance instance)
        {
            // Simple logic for the first entity: PurchaseRequest
            var pr = await _context.PurchaseRequests.FirstOrDefaultAsync(p => p.Id == instance.EntityId);
            if (pr != null)
            {
                pr.Status = instance.Status == WorkflowStatus.Approved ? PurchaseRequestStatus.Approved : PurchaseRequestStatus.Rejected;
                _context.Entry(pr).State = EntityState.Modified;
                await _context.SaveChangesAsync();
            }
        }
    }

    public class WorkflowActionDto
    {
        public WorkflowAction Action { get; set; }
        public string? Note { get; set; }
    }
}
