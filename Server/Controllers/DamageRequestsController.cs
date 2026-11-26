using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DamageRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ERP.Api.Services.IAccountingService _accounting;

        public DamageRequestsController(AppDbContext context, ERP.Api.Services.IAccountingService accounting)
        {
            _context = context;
            _accounting = accounting;
        }

        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DamageRequest>>> GetDamageRequests()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var query = _context.DamageRequests
                .Include(d => d.Product)
                .Include(d => d.Warehouse)
                .AsQueryable();

            if (userRole != "Admin")
            {
                var assignedIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                
                query = query.Where(d => d.WarehouseId.HasValue && assignedIds.Contains(d.WarehouseId.Value));
            }

            return await query.OrderByDescending(d => d.DateReported).ToListAsync();
        }

        [HasPermission(AppPermissions.Inventory_ReportDamage)]
        [HttpPost]
        public async Task<ActionResult<DamageRequest>> CreateDamageRequest(DamageRequest request)
        {
            request.RequestNumber = "DMG-" + DateTime.UtcNow.ToString("yyyyMMddhhmmss");
            request.DateReported = DateTime.UtcNow;
            _context.DamageRequests.Add(request);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetDamageRequests), new { id = request.Id }, request);
        }

        [HasPermission(AppPermissions.Inventory_ManualAdjustments)]
        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveDamageRequest(Guid id)
        {
            var req = await _context.DamageRequests
                .Include(d => d.Warehouse)
                .FirstOrDefaultAsync(d => d.Id == id);
            if (req == null) return NotFound();

            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            if (userRole != "Admin" && req.WarehouseId.HasValue)
            {
                var isAssigned = await _context.UserWarehouses.AnyAsync(uw => uw.UserId == userId && uw.WarehouseId == req.WarehouseId.Value);
                if (!isAssigned) return Forbid("You are not assigned to the warehouse of this damage request.");
            }

            if (req.Status != "Pending") return BadRequest("Can only approve pending requests.");

            req.Status = "Approved";

            // 1. Update Product Stock Quantity (Global & Specific Warehouse)
            var product = await _context.Products.FindAsync(req.ProductId);
            if (product != null)
            {
                product.StockQuantity -= req.Quantity;
                _context.Entry(product).State = EntityState.Modified;

                if (req.WarehouseId.HasValue)
                {
                    var stockLevel = await _context.StockLevels
                        .FirstOrDefaultAsync(s => s.ProductId == req.ProductId && s.WarehouseId == req.WarehouseId.Value);
                    
                    if (stockLevel != null)
                    {
                        stockLevel.Quantity -= req.Quantity;
                        stockLevel.UpdatedAt = DateTime.UtcNow;
                        _context.Entry(stockLevel).State = EntityState.Modified;
                    }
                }
            }

            // 2. Create Stock Movement Record
            var stockMovement = new StockMovement
            {
                ProductId = req.ProductId,
                WarehouseId = req.WarehouseId, // Explicitly tracking warehouse in movement
                Type = MovementType.Adjustment, // Out/Loss
                Quantity = -req.Quantity,
                MovementDate = DateTime.UtcNow,
                Note = $"Damage Request {req.RequestNumber} Approved (Warehouse: {req.Warehouse?.Name ?? "N/A"})",
                CreatedAt = DateTime.UtcNow
            };
            _context.StockMovements.Add(stockMovement);

            // 3. Accounting Hook - Record Financial Loss
            var inventoryAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset" && a.Name.Contains("Inventory"))
                ?? new Account { Id = Guid.NewGuid(), Name = "Inventory Asset", Type = "Asset", AccountCode = "1200" };
            
            var damageExpenseAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Expense" && a.Name.Contains("Damage"))
                ?? new Account { Id = Guid.NewGuid(), Name = "Inventory Damage Expense", Type = "Expense", AccountCode = "5300" };

            if (_context.Entry(inventoryAccount).State == EntityState.Detached) _context.Accounts.Add(inventoryAccount);
            if (_context.Entry(damageExpenseAccount).State == EntityState.Detached) _context.Accounts.Add(damageExpenseAccount);

            await _context.SaveChangesAsync();

            var lossValue = req.Quantity * product.Price; // Using product price as loss value
            await _accounting.PostJournalEntryAsync(
                $"DMG-{req.RequestNumber.Substring(4,6)}", 
                $"Inventory Damage: {product.Name}", 
                "EGP",
                new List<(Guid AccountId, decimal Debit, decimal Credit)> {
                    (damageExpenseAccount.Id, lossValue, 0), // Debit Expense
                    (inventoryAccount.Id, 0, lossValue)      // Credit Inventory
                },
                DateTime.UtcNow,
                req.WarehouseId // Link to specific warehouse P&L
            );

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HasPermission(AppPermissions.Inventory_ManualAdjustments)]
        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectDamageRequest(Guid id)
        {
            var req = await _context.DamageRequests.FindAsync(id);
            if (req == null) return NotFound();

            if (req.Status != "Pending") return BadRequest("Can only reject pending requests.");

            req.Status = "Rejected";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HasPermission(AppPermissions.Inventory_ReportDamage)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDamageRequest(Guid id)
        {
            var req = await _context.DamageRequests.FindAsync(id);
            if (req == null) return NotFound();

            _context.DamageRequests.Remove(req);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
