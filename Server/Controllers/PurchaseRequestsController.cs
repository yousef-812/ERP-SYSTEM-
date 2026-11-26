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
    public class PurchaseRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWorkflowService _workflowService;

        public PurchaseRequestsController(AppDbContext context, IWorkflowService workflowService)
        {
            _context = context;
            _workflowService = workflowService;
        }

        // GET: api/PurchaseRequests
        [HasPermission(AppPermissions.Procurement_ViewRequests)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseRequest>>> GetPurchaseRequests()
        {
            var query = _context.PurchaseRequests
                .Include(p => p.RequestedBy)
                .Include(p => p.Warehouse)
                .Include(p => p.WorkflowInstance)
                .Include(p => p.Details)
                    .ThenInclude(d => d.Product)
                .Include(p => p.Details)
                    .ThenInclude(d => d.Warehouse)
                .AsQueryable();

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                // Users can see:
                // 1. Requests they created themselves
                // 2. Requests from warehouses they have access to
                query = query.Where(p => 
                    p.RequestedById == userId || 
                    (p.RequestedBy != null && p.RequestedBy.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.RequestedBy.WarehouseId.Value)) ||
                    (p.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.WarehouseId.Value))
                );
            }

            return await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        }

        // POST: api/PurchaseRequests
        [HasPermission(AppPermissions.Procurement_CreatePO)]
        [HttpPost]
        public async Task<ActionResult<PurchaseRequest>> CreatePurchaseRequest(PurchaseRequest pr)
        {
            pr.Id = Guid.NewGuid();
            pr.PRNumber = $"PR-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
            pr.RequestDate = DateTime.UtcNow;
            pr.Status = PurchaseRequestStatus.Draft;
            pr.CreatedAt = DateTime.UtcNow;

            // Calculate Total
            pr.TotalEstimatedAmount = pr.Details.Sum(d => d.Quantity * d.EstimatedUnitPrice);

            // Automatically link to the current user's employee record
            if (Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var username = User.Identity?.Name;
                
                // 1. Try find by ID or Email
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == userId || e.Email == username);
                
                // 2. Try find by Name (if username matches)
                if (employee == null && !string.IsNullOrEmpty(username))
                {
                    employee = await _context.Employees.FirstOrDefaultAsync(e => e.Name == username);
                }

                // 3. Fallback: Create employee if not found (Self-healing system)
                if (employee == null)
                {
                    employee = new Employee 
                    { 
                        Id = userId, 
                        Name = username ?? "System User", 
                        Email = username,
                        Position = "Staff", 
                        Department = "General" 
                    };
                    _context.Employees.Add(employee);
                    await _context.SaveChangesAsync();
                }

                pr.RequestedById = employee.Id;
            }

            _context.PurchaseRequests.Add(pr);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPurchaseRequests), new { id = pr.Id }, pr);
        }

        // POST: api/PurchaseRequests/{id}/submit
        [HasPermission(AppPermissions.Procurement_CreatePO)]
        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitToWorkflow(Guid id)
        {
            var pr = await _context.PurchaseRequests.Include(p => p.RequestedBy).FirstOrDefaultAsync(p => p.Id == id);
            if (pr == null) return NotFound("Purchase Request not found.");

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                if (pr.RequestedBy == null || !pr.RequestedBy.WarehouseId.HasValue || !assignedWarehouseIds.Contains(pr.RequestedBy.WarehouseId.Value))
                    return StatusCode(403, "ليس لديك صلاحية لتقديم طلب شراء لمستودع خارج صلاحياتك.");
            }

            if (pr.Status != PurchaseRequestStatus.Draft)
                return BadRequest("Only draft requests can be submitted.");

            try
            {
                var instance = await _workflowService.InitiateWorkflowAsync("Purchase Request", pr.Id);
                
                pr.WorkflowInstanceId = instance.Id;
                pr.Status = PurchaseRequestStatus.PendingApproval;
                
                await _context.SaveChangesAsync();
                return Ok(new { message = "Submitted for approval.", workflowInstanceId = instance.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // POST: api/PurchaseRequests/{id}/approve
        [HasPermission(AppPermissions.Procurement_ApproveRequests)]
        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveRequest(Guid id)
        {
            var pr = await _context.PurchaseRequests.FirstOrDefaultAsync(p => p.Id == id);
            if (pr == null) return NotFound();

            if (pr.Status != PurchaseRequestStatus.PendingApproval)
                return BadRequest("Only requests pending approval can be approved.");

            pr.Status = PurchaseRequestStatus.Approved;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Request approved successfully." });
        }

        // POST: api/PurchaseRequests/{id}/reject
        [HasPermission(AppPermissions.Procurement_ApproveRequests)]
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectRequest(Guid id)
        {
            var pr = await _context.PurchaseRequests.FirstOrDefaultAsync(p => p.Id == id);
            if (pr == null) return NotFound();

            if (pr.Status != PurchaseRequestStatus.PendingApproval)
                return BadRequest("Only requests pending approval can be rejected.");

            pr.Status = PurchaseRequestStatus.Rejected;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Request rejected." });
        }
    }
}
