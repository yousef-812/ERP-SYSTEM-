using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using ERP.Api.DTOs;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IProcurementService _procurement;

        public PurchaseOrdersController(AppDbContext context, IProcurementService procurement)
        {
            _context = context;
            _procurement = procurement;
        }

        [HasPermission(AppPermissions.Procurement_ViewPO)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseOrder>>> GetPurchaseOrders()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var query = _context.PurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.Warehouse)
                .Include(p => p.Details)
                    .ThenInclude(d => d.Product)
                .AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(p => p.WarehouseId.HasValue && assignedWarehouseIds.Contains(p.WarehouseId.Value));
            }

            return await query.OrderByDescending(p => p.OrderDate).ToListAsync();
        }

        [HasPermission(AppPermissions.Procurement_ViewPO)]
        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseOrder>> GetPurchaseOrder(Guid id)
        {
            var po = await _context.PurchaseOrders
                .Include(p => p.Supplier)
                .Include(p => p.Warehouse)
                .Include(p => p.Details)
                .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (po == null) return NotFound();
            return po;
        }

        [HasPermission(AppPermissions.Procurement_CreatePO)]
        [HttpPost]
        public async Task<ActionResult<PurchaseOrder>> CreatePurchaseOrder(CreatePurchaseOrderDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var po = new PurchaseOrder
                {
                    SupplierId = dto.SupplierId,
                    WarehouseId = dto.WarehouseId,
                    OrderDate = dto.OrderDate,
                    Status = "Draft",
                    Details = dto.Details.Select(d => new PurchaseOrderDetail
                    {
                        ProductId = d.ProductId,
                        Quantity = d.Quantity,
                        UnitPrice = d.UnitPrice
                    }).ToList()
                };

                var result = await _procurement.CreatePOAsync(po);
                return CreatedAtAction(nameof(GetPurchaseOrder), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HasPermission(AppPermissions.Procurement_ApproveRequests)]
        [HttpPost("{id}/receive")]
        public async Task<IActionResult> ReceivePurchaseOrder(Guid id)
        {
            try
            {
                var result = await _procurement.ReceivePOAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HasPermission(AppPermissions.Procurement_CreatePO)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePurchaseOrder(Guid id, CreatePurchaseOrderDto dto)
        {
            var po = await _context.PurchaseOrders.Include(p => p.Details).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFound();
            if (po.Status == "Received") return BadRequest("Cannot edit a received Purchase Order.");

            po.SupplierId = dto.SupplierId;
            // 1. Remove existing details and save to clear the state
            var existingDetails = await _context.PurchaseOrderDetails.Where(d => d.PurchaseOrderId == id).ToListAsync();
            _context.PurchaseOrderDetails.RemoveRange(existingDetails);
            await _context.SaveChangesAsync();

            // 2. Add new details
            var newDetails = dto.Details.Select(d => new PurchaseOrderDetail
            {
                PurchaseOrderId = id,
                ProductId = d.ProductId,
                Quantity = d.Quantity,
                UnitPrice = d.UnitPrice
            }).ToList();

            _context.PurchaseOrderDetails.AddRange(newDetails);
            po.TotalAmount = newDetails.Sum(d => d.Quantity * d.UnitPrice);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.PurchaseOrders.AnyAsync(e => e.Id == id)) return NotFound();
                throw;
            }
            
            return Ok(po);
        }
    }
}
