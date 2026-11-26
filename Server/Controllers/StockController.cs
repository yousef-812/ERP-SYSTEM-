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
    public class StockController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ERP.Api.Services.IAccountingService _accounting;

        public StockController(AppDbContext context, ERP.Api.Services.IAccountingService accounting)
        {
            _context = context;
            _accounting = accounting;
        }

        // POST: api/Stock/receive
        [HasPermission(AppPermissions.Inventory_ManualAdjustments)]
        [HttpPost("receive")]
        public async Task<IActionResult> ReceiveStock([FromBody] StockReceiveDto dto)
        {
            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product == null)
                return NotFound("Product not found.");

            // Validate Warehouse Access
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var hasAccess = await _context.UserWarehouses.AnyAsync(uw => uw.UserId == userId && uw.WarehouseId == dto.WarehouseId);
                if (!hasAccess) return StatusCode(403, "ليس لديك صلاحية لإضافة مخزون في هذا المستودع.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Create Stock Movement Record
                var movement = new StockMovement
                {
                    Id = Guid.NewGuid(),
                    ProductId = dto.ProductId,
                    SupplierId = dto.SupplierId,
                    WarehouseId = dto.WarehouseId,
                    Quantity = dto.Quantity,
                    UnitCost = dto.UnitCost,
                    Type = MovementType.Receiving,
                    MovementDate = DateTime.UtcNow,
                    Note = dto.Note,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StockMovements.Add(movement);

                // 2. Update Product Stock Level
                product.StockQuantity += dto.Quantity;
                product.UpdatedAt = DateTime.UtcNow;
                _context.Entry(product).State = EntityState.Modified;

                // 2b. Update Warehouse-Specific Stock Level
                var stockLevel = await _context.StockLevels.FirstOrDefaultAsync(sl => sl.ProductId == dto.ProductId && sl.WarehouseId == dto.WarehouseId);
                if (stockLevel == null)
                {
                    stockLevel = new StockLevel
                    {
                        Id = Guid.NewGuid(),
                        ProductId = dto.ProductId,
                        WarehouseId = dto.WarehouseId,
                        Quantity = dto.Quantity,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.StockLevels.Add(stockLevel);
                }
                else
                {
                    stockLevel.Quantity += dto.Quantity;
                    stockLevel.UpdatedAt = DateTime.UtcNow;
                }

                // 3. Accounting Hook - Inventory Valuation Increase
                var inventoryAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset" && a.Name.Contains("Inventory"))
                    ?? new Account { Id = Guid.NewGuid(), Name = "Inventory Asset", Type = "Asset", AccountCode = "1200" };
                
                var cashAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset" && a.Name.Contains("Cash"))
                    ?? new Account { Id = Guid.NewGuid(), Name = "Cash", Type = "Asset", AccountCode = "1000" };

                if (_context.Entry(inventoryAccount).State == EntityState.Detached) _context.Accounts.Add(inventoryAccount);
                if (_context.Entry(cashAccount).State == EntityState.Detached) _context.Accounts.Add(cashAccount);

                await _context.SaveChangesAsync();

                var totalValue = dto.Quantity * dto.UnitCost;
                await _accounting.PostJournalEntryAsync($"RCV-{movement.Id.ToString().Substring(0,6)}", $"Stock Receive: {product.Name}", "EGP",
                    new List<(Guid AccountId, decimal Debit, decimal Credit)> {
                        (inventoryAccount.Id, totalValue, 0), // Debit Inventory
                        (cashAccount.Id, 0, totalValue)       // Credit Cash/AP
                    },
                    DateTime.UtcNow,
                    dto.WarehouseId); // Track in warehouse P&L

                // 4. Save and Commit
                await transaction.CommitAsync();

                return Ok(new { message = "Stock received successfully.", newQuantity = product.StockQuantity });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        // POST: api/Stock/adjust
        [HasPermission(AppPermissions.Inventory_ManualAdjustments)]
        [HttpPost("adjust")]
        public async Task<IActionResult> AdjustStock([FromBody] StockAdjustDto dto)
        {
            var product = await _context.Products.FindAsync(dto.ProductId);
            if (product == null)
                return NotFound("Product not found.");

            // Validate Warehouse Access
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            if (userRole != "Admin" && Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
            {
                var hasAccess = await _context.UserWarehouses.AnyAsync(uw => uw.UserId == userId && uw.WarehouseId == dto.WarehouseId);
                if (!hasAccess) return StatusCode(403, "ليس لديك صلاحية لإجراء تسوية في هذا المستودع.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var movement = new StockMovement
                {
                    Id = Guid.NewGuid(),
                    ProductId = dto.ProductId,
                    WarehouseId = dto.WarehouseId,
                    Quantity = dto.AdjustmentQuantity, // Can be negative for breakage/loss
                    UnitCost = product.Price, // Use current price as cost for adjustment if unknown
                    Type = MovementType.Adjustment,
                    MovementDate = DateTime.UtcNow,
                    Note = dto.Note,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StockMovements.Add(movement);

                product.StockQuantity += dto.AdjustmentQuantity;
                product.UpdatedAt = DateTime.UtcNow;
                _context.Entry(product).State = EntityState.Modified;

                // Update Warehouse-Specific Stock Level
                var stockLevel = await _context.StockLevels.FirstOrDefaultAsync(sl => sl.ProductId == dto.ProductId && sl.WarehouseId == dto.WarehouseId);
                if (stockLevel == null)
                {
                    stockLevel = new StockLevel
                    {
                        Id = Guid.NewGuid(),
                        ProductId = dto.ProductId,
                        WarehouseId = dto.WarehouseId,
                        Quantity = dto.AdjustmentQuantity,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.StockLevels.Add(stockLevel);
                }
                else
                {
                    stockLevel.Quantity += dto.AdjustmentQuantity;
                    stockLevel.UpdatedAt = DateTime.UtcNow;
                }

                // Accounting Hook
                var inventoryAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Asset" && a.Name.Contains("Inventory"))
                    ?? new Account { Id = Guid.NewGuid(), Name = "Inventory Asset", Type = "Asset", AccountCode = "1200" };
                
                var adjustmentExpense = await _context.Accounts.FirstOrDefaultAsync(a => a.Type == "Expense" && a.Name.Contains("Adjustment"))
                    ?? new Account { Id = Guid.NewGuid(), Name = "Inventory Adjustment", Type = "Expense", AccountCode = "5200" };

                if (_context.Entry(inventoryAccount).State == EntityState.Detached) _context.Accounts.Add(inventoryAccount);
                if (_context.Entry(adjustmentExpense).State == EntityState.Detached) _context.Accounts.Add(adjustmentExpense);

                await _context.SaveChangesAsync();

                var adjustmentValue = Math.Abs(dto.AdjustmentQuantity * product.Price);

                if (dto.AdjustmentQuantity < 0)
                {
                    // Loss/Breakage
                    await _accounting.PostJournalEntryAsync($"ADJ-{movement.Id.ToString().Substring(0,6)}", $"Stock Loss: {product.Name}", "EGP",
                        new List<(Guid AccountId, decimal Debit, decimal Credit)> {
                            (adjustmentExpense.Id, adjustmentValue, 0), // Debit Expense
                            (inventoryAccount.Id, 0, adjustmentValue)   // Credit Inventory
                        },
                        DateTime.UtcNow,
                        dto.WarehouseId);
                }
                else
                {
                    // Gain/Found
                    await _accounting.PostJournalEntryAsync($"ADJ-{movement.Id.ToString().Substring(0,6)}", $"Stock Gain: {product.Name}", "EGP",
                        new List<(Guid AccountId, decimal Debit, decimal Credit)> {
                            (inventoryAccount.Id, adjustmentValue, 0),  // Debit Inventory
                            (adjustmentExpense.Id, 0, adjustmentValue)  // Credit Expense (offset)
                        },
                        DateTime.UtcNow,
                        dto.WarehouseId);
                }

                await transaction.CommitAsync();

                return Ok(new { message = "Stock adjusted successfully.", newQuantity = product.StockQuantity });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet("adjustments")]
        public async Task<ActionResult<IEnumerable<StockMovement>>> GetAdjustments()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var query = _context.StockMovements
                .Include(m => m.Product)
                .Where(m => m.Type == MovementType.Adjustment)
                .AsQueryable();

            if (userRole != "Admin")
            {
                var assignedIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                query = query.Where(m => m.WarehouseId.HasValue && assignedIds.Contains(m.WarehouseId.Value));
            }

            return await query.OrderByDescending(m => m.MovementDate).ToListAsync();
        }

        // GET: api/Stock/history/{productId}
        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet("history/{productId}")]
        public async Task<ActionResult<IEnumerable<StockMovement>>> GetProductHistory(Guid productId)
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var query = _context.StockMovements
                .Include(m => m.Supplier)
                .Where(m => m.ProductId == productId)
                .AsQueryable();

            if (userRole != "Admin")
            {
                var assignedIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                query = query.Where(m => !m.WarehouseId.HasValue || assignedIds.Contains(m.WarehouseId.Value));
            }

            return await query.OrderByDescending(m => m.MovementDate).ToListAsync();
        }

        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

            var assignedWarehouseIds = (userRole == "Admin") ? null : await _context.UserWarehouses
                .Where(uw => uw.UserId == userId)
                .Select(uw => uw.WarehouseId)
                .ToListAsync();

            var productsRaw = await _context.Products.Include(p => p.StockLevels).ToListAsync();

            var reports = productsRaw.Select(p => {
                var levelsInAssigned = p.StockLevels
                    .Where(sl => assignedWarehouseIds == null || assignedWarehouseIds.Contains(sl.WarehouseId))
                    .ToList();
                
                decimal stockInAssigned = 0;
                bool isRelevant = true;

                if (assignedWarehouseIds == null)
                {
                    stockInAssigned = p.StockQuantity;
                }
                else
                {
                    // For non-admins, a product is only "relevant" to their dashboard if it has an existing stock level record 
                    // (even if 0) in one of their assigned warehouses. 
                    // This prevents every product in the system from showing up as "Critical" if it was never in their warehouse.
                    isRelevant = levelsInAssigned.Any();
                    stockInAssigned = levelsInAssigned.Sum(sl => sl.Quantity);
                }
                
                return new {
                    Name = string.IsNullOrEmpty(p.NameEn) ? p.Name : p.NameEn,
                    Sku = p.SKU,
                    Stock = stockInAssigned,
                    Threshold = p.MinStockLevel,
                    Status = (!isRelevant) ? "Normal" : (stockInAssigned == 0 ? "Critical" : (stockInAssigned <= p.MinStockLevel ? "Low" : "Normal"))
                };
            }).ToList();

            var lowStockProducts = reports.Where(r => r.Status != "Normal").ToList();
            var totalItems = reports.Count;
            var lowStockCount = lowStockProducts.Count;
            
            var warehouseQuery = _context.Warehouses.Include(w => w.StockLevels).AsQueryable();
            if (userRole != "Admin")
            {
                var assignedIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                warehouseQuery = warehouseQuery.Where(w => assignedIds.Contains(w.Id));
            }

            var warehousesRaw = await warehouseQuery.ToListAsync();

            var warehouses = warehousesRaw.Select(w => new {
                Name = w.Name,
                City = w.Location,
                Load = w.StockLevels.Any() ? $"{Math.Min(100, (int)w.StockLevels.Sum(s => s.Quantity) / 10)}%" : "0%" // Mocking capacity logic for now
            }).ToList();

            var warehousesCount = warehouses.Count;
            
            var damageQuery = _context.DamageRequests.AsQueryable();
            if (userRole != "Admin")
            {
                var assignedIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                damageQuery = damageQuery.Where(d => d.WarehouseId.HasValue && assignedIds.Contains(d.WarehouseId.Value));
            }
            var damageRequestsCount = await damageQuery.CountAsync();

            return Ok(new {
                totalItems,
                lowStockCount,
                warehousesCount,
                damageRequestsCount,
                lowStockProducts,
                warehouses
            });
        }
    }

    public class StockReceiveDto
    {
        public Guid ProductId { get; set; }
        public Guid SupplierId { get; set; }
        public Guid WarehouseId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public string? Note { get; set; }
    }

    public class StockAdjustDto
    {
        public Guid ProductId { get; set; }
        public Guid WarehouseId { get; set; }
        public int AdjustmentQuantity { get; set; }
        public string? Note { get; set; }
    }
}
