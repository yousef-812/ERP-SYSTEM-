using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.AspNetCore.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MaintenanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MaintenanceController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("sync-stock-levels")]
        public async Task<IActionResult> SyncStockLevels()
        {
            // 1. Get all movements
            var movements = await _context.StockMovements.ToListAsync();
            
            // 2. Clear current stock levels to rebuild
            var existingLevels = await _context.StockLevels.ToListAsync();
            _context.StockLevels.RemoveRange(existingLevels);
            await _context.SaveChangesAsync();

            // 3. Aggregate movements per Product and Warehouse
            // Note: We only care about movements that have a WarehouseId
            var aggregated = movements
                .Where(m => m.WarehouseId.HasValue)
                .GroupBy(m => new { m.ProductId, WarehouseId = m.WarehouseId!.Value })
                .Select(g => new StockLevel
                {
                    Id = Guid.NewGuid(),
                    ProductId = g.Key.ProductId,
                    WarehouseId = g.Key.WarehouseId,
                    Quantity = g.Sum(m => m.Quantity),
                    UpdatedAt = DateTime.UtcNow
                })
                .Where(sl => sl.Quantity != 0) // Only keep non-zero levels
                .ToList();

            // 4. Add new levels
            _context.StockLevels.AddRange(aggregated);
            
            // 5. Update global product stock as well to ensure consistency
            var products = await _context.Products.ToListAsync();
            foreach(var p in products)
            {
                p.StockQuantity = (int)aggregated.Where(sl => sl.ProductId == p.Id).Sum(sl => sl.Quantity);
            }

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Stock levels synchronized successfully based on movement history.", 
                recordsCreated = aggregated.Count 
            });
        }
    }
}
