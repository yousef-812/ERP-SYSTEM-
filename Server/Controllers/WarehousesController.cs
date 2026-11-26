using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/warehouses")]
    public class WarehousesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public WarehousesController(AppDbContext context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
            Console.WriteLine("DEBUG: WarehousesController initialized.");
        }

        // --- Warehouses ---
        // الموظف العادي يحتاج Inventory_ViewStock
        // المسؤول يحتاج System_UserAdmin ليتمكن من توزيع الصلاحيات
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Warehouse>>> GetWarehouses()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var currentUserId)) 
                return Unauthorized();

            var authService = HttpContext.RequestServices.GetRequiredService<IAuthorizationService>();
            var isStockViewer = (await authService.AuthorizeAsync(User, AppPermissions.Inventory_ViewStock)).Succeeded;
            var isUserAdmin = (await authService.AuthorizeAsync(User, AppPermissions.System_UserAdmin)).Succeeded;
            var isHRManager = (await authService.AuthorizeAsync(User, AppPermissions.HR_ManageEmployees)).Succeeded;
            var isHRViewer = (await authService.AuthorizeAsync(User, AppPermissions.HR_ViewEmployees)).Succeeded;
            var isPayrollViewer = (await authService.AuthorizeAsync(User, AppPermissions.HR_ViewPayroll)).Succeeded;
            var isPayrollProcessor = (await authService.AuthorizeAsync(User, AppPermissions.HR_ProcessPayroll)).Succeeded;
            var isHRRecruitment = (await authService.AuthorizeAsync(User, AppPermissions.HR_Recruitment)).Succeeded;
            var isHRAttendance = (await authService.AuthorizeAsync(User, AppPermissions.HR_ViewAttendance)).Succeeded;
            var isHRAppraisals = (await authService.AuthorizeAsync(User, AppPermissions.HR_ViewAppraisals)).Succeeded;
            var isHRTimeOff = (await authService.AuthorizeAsync(User, AppPermissions.HR_ViewTimeOff)).Succeeded;
            var isProcurementCreator = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_CreatePO)).Succeeded;
            var isProcurementViewer = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_ViewPO)).Succeeded;
            var isFinanceViewer = (await authService.AuthorizeAsync(User, AppPermissions.Accounting_ViewExpenses)).Succeeded;

            bool hasAnyHR = isHRManager || isHRViewer || isPayrollViewer || isPayrollProcessor || isHRRecruitment || isHRAttendance || isHRAppraisals || isHRTimeOff;

            if (!isStockViewer && !isUserAdmin && !hasAnyHR && !isProcurementCreator && !isProcurementViewer && !isFinanceViewer && userRole != "Admin")
                return Forbid();

            var query = _context.Warehouses
                .Include(w => w.StockLevels)
                .ThenInclude(s => s.Product)
                .AsQueryable();

            if (userRole != "Admin")
            {
                var assignedIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == currentUserId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                
                query = query.Where(w => assignedIds.Contains(w.Id));
            }

            return await query.ToListAsync();
        }

        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet("{id}")]
        public async Task<ActionResult<Warehouse>> GetWarehouse(Guid id)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var warehouse = await _context.Warehouses
                .Include(w => w.StockLevels)
                .ThenInclude(s => s.Product)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (warehouse == null) return NotFound();

            if (userRole != "Admin")
            {
                var isAssigned = await _context.UserWarehouses.AnyAsync(uw => uw.UserId == userId && uw.WarehouseId == id);
                if (!isAssigned) return Forbid();
            }

            return warehouse;
        }

        [HasPermission(AppPermissions.Inventory_ManageWarehouses)]
        [HttpPost]
        public async Task<ActionResult<Warehouse>> PostWarehouse(Warehouse warehouse)
        {
            warehouse.Id = Guid.NewGuid();
            _context.Warehouses.Add(warehouse);
            await _context.SaveChangesAsync();
            
            await _auditLogService.LogAsync(User.Identity?.Name ?? "System", "Create", "Warehouse", warehouse.Id.ToString(), $"Warehouse: {warehouse.Name}");
            
            return CreatedAtAction(nameof(GetWarehouse), new { id = warehouse.Id }, warehouse);
        }

        [HasPermission(AppPermissions.Inventory_ManageWarehouses)]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutWarehouse(Guid id, Warehouse warehouse)
        {
            if (id != warehouse.Id) return BadRequest();

            _context.Entry(warehouse).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(User.Identity?.Name ?? "System", "Update", "Warehouse", warehouse.Id.ToString(), $"Warehouse: {warehouse.Name}");
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Warehouses.Any(e => e.Id == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HasPermission(AppPermissions.Inventory_ManageWarehouses)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWarehouse(Guid id)
        {
            var warehouse = await _context.Warehouses.Include(w => w.StockLevels).FirstOrDefaultAsync(w => w.Id == id);
            if (warehouse == null) return NotFound();

            if (warehouse.StockLevels.Any(s => s.Quantity > 0))
            {
                return BadRequest("Cannot delete warehouse with existing stock.");
            }

            _context.Warehouses.Remove(warehouse);
            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(User.Identity?.Name ?? "System", "Delete", "Warehouse", id.ToString(), $"Warehouse: {warehouse.Name}");

            return NoContent();
        }

        // --- Inventory Transactions (Damage/Adjustment) ---
        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet("transactions")]
        public async Task<ActionResult<IEnumerable<InventoryTransaction>>> GetTransactions()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var query = _context.InventoryTransactions
                .Include(t => t.Product)
                .Include(t => t.Warehouse)
                .Include(t => t.CreatedBy)
                .AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses.Where(uw => uw.UserId == userId).Select(uw => uw.WarehouseId).ToListAsync();
                query = query.Where(t => assignedWarehouseIds.Contains(t.WarehouseId));
            }

            return await query.OrderByDescending(t => t.TransactionDate).ToListAsync();
        }

        [HasPermission(AppPermissions.Inventory_ManualAdjustments)]
        [HttpPost("transactions")]
        public async Task<ActionResult<InventoryTransaction>> CreateTransaction(InventoryTransaction transaction)
        {
            _context.InventoryTransactions.Add(transaction);
            
            // Logic to update StockLevel automatically
            var stock = await _context.StockLevels
                .FirstOrDefaultAsync(s => s.ProductId == transaction.ProductId && s.WarehouseId == transaction.WarehouseId);
            
            if (stock == null)
            {
                stock = new StockLevel { ProductId = transaction.ProductId, WarehouseId = transaction.WarehouseId, Quantity = 0 };
                _context.StockLevels.Add(stock);
            }

            if (transaction.Type == "Incoming" || transaction.Type == "Return")
                stock.Quantity += transaction.Quantity;
            else if (transaction.Type == "Outgoing" || transaction.Type == "Damage" || transaction.Type == "Adjustment")
                stock.Quantity -= transaction.Quantity;

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(User.Identity?.Name ?? "System", $"Inventory {transaction.Type}", "Product", transaction.ProductId.ToString(), $"Quantity: {transaction.Quantity} at Warehouse {transaction.WarehouseId}");

            return CreatedAtAction(nameof(GetTransactions), new { id = transaction.Id }, transaction);
        }
    }
}
