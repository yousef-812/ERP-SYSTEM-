using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;
using System.Security.Claims;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLog;

        public ProductsController(AppDbContext context, IAuditLogService auditLog)
        {
            _context = context;
            _auditLog = auditLog;
        }
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetProducts()
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid userId = Guid.Empty;
            if (Guid.TryParse(userIdStr, out var pId)) userId = pId;

            var authService = HttpContext.RequestServices.GetRequiredService<IAuthorizationService>();
            var isStockViewer = (await authService.AuthorizeAsync(User, AppPermissions.Inventory_ViewStock)).Succeeded;
            var isProcurementCreator = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_CreatePO)).Succeeded;
            var isProcurementViewer = (await authService.AuthorizeAsync(User, AppPermissions.Procurement_ViewPO)).Succeeded;

            if (!isStockViewer && !isProcurementCreator && !isProcurementViewer && userRole != "Admin")
                return Forbid();

            var assignedWarehouseIds = new List<Guid>();
            var productsQuery = _context.Products
                .Include(p => p.StockLevels)
                    .ThenInclude(sl => sl.Warehouse)
                .AsQueryable();

            if (userRole != "Admin")
            {
                assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                // If user is procurement staff, we show products that they MIGHT want to order, 
                // but we might still want to filter by warehouse if they are only in one location.
                if (assignedWarehouseIds.Any())
                {
                    productsQuery = productsQuery.Where(p => p.StockLevels.Any(sl => assignedWarehouseIds.Contains(sl.WarehouseId)) || isProcurementCreator);
                }
            }

            var products = await productsQuery
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return products.Select(p => {
                // Filter levels to assigned ones for non-admins, unless they are procurement staff who need to see everything
                var relevantLevels = (userRole == "Admin" || isProcurementCreator) 
                    ? p.StockLevels 
                    : p.StockLevels.Where(sl => assignedWarehouseIds.Contains(sl.WarehouseId)).ToList();

                var calcStock = relevantLevels.Sum(sl => sl.Quantity);

                return new {
                    p.Id,
                    p.Name,
                    p.NameEn,
                    p.SKU,
                    p.Category,
                    p.Price,
                    p.Barcode,
                    StockQuantity = calcStock, 
                    p.MinStockLevel,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.RowVersion,
                    WarehouseId = relevantLevels.FirstOrDefault()?.WarehouseId,
                    WarehouseName = relevantLevels.FirstOrDefault()?.Warehouse?.Name,
                    StockLevels = relevantLevels.Select(sl => new { sl.WarehouseId, sl.Quantity }).ToList()
                };
            }).ToList();
        }

        // GET: api/Products/5
        [HasPermission(AppPermissions.Inventory_ViewStock)]
        [HttpGet("{id}")]
        public async Task<ActionResult<Product>> GetProduct(Guid id)
        {
            var product = await _context.Products.FindAsync(id);

            if (product == null)
            {
                return NotFound();
            }

            return product;
        }

        private async Task<string> GenerateUniqueBarcode()
        {
            var random = new Random();
            string barcode;
            bool exists;
            do
            {
                barcode = "741" + random.Next(100000000, 999999999).ToString() + random.Next(10, 99).ToString();
                exists = await _context.Products.AnyAsync(p => p.Barcode == barcode);
            } while (exists);
            return barcode;
        }

        // POST: api/Products
        [HasPermission(AppPermissions.Inventory_ManageProducts)]
        [HttpPost]
        public async Task<ActionResult<Product>> PostProduct(Product product)
        {
            if (product == null) return BadRequest("Product data is required.");

            product.Id = Guid.NewGuid();
            product.CreatedAt = DateTime.UtcNow;
            product.UpdatedAt = DateTime.UtcNow;

            // Ensure SKU is provided
            if (string.IsNullOrWhiteSpace(product.SKU))
            {
                return BadRequest(new { Message = "SKU is required." });
            }

            // Ensure Name is provided
            if (string.IsNullOrWhiteSpace(product.Name))
            {
                return BadRequest(new { Message = "Product Name is required." });
            }

            // --- ADVANCED AUTO BARCODE GENERATION ---
            if (string.IsNullOrWhiteSpace(product.Barcode))
            {
                product.Barcode = await GenerateUniqueBarcode();
            }
            else
            {
                // Ensure manual barcode is also unique
                if (await _context.Products.AnyAsync(p => p.Barcode == product.Barcode))
                {
                    return BadRequest(new { Message = "Barcode already exists for another product." });
                }
            }
            // ----------------------------------------
            
            try 
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Guid userId = Guid.Empty;
                if (Guid.TryParse(userIdStr, out var pId)) userId = pId;
                
                if (userId == Guid.Empty)
                {
                    var fallbackUser = await _context.Users.OrderBy(u => u.CreatedAt).FirstOrDefaultAsync();
                    if (fallbackUser != null) userId = fallbackUser.Id;
                }

                _context.Products.Add(product);
                
                // If a WarehouseId was provided, create an initial stock level
                if (product.WarehouseId.HasValue && product.WarehouseId != Guid.Empty)
                {
                    _context.StockLevels.Add(new StockLevel
                    {
                        Id = Guid.NewGuid(),
                        ProductId = product.Id,
                        WarehouseId = product.WarehouseId.Value,
                        Quantity = product.StockQuantity,
                        BinLocation = "Initial Stock"
                    });
                    
                    // Also log the transaction
                    _context.InventoryTransactions.Add(new InventoryTransaction
                    {
                        Id = Guid.NewGuid(),
                        ProductId = product.Id,
                        WarehouseId = product.WarehouseId.Value,
                        Type = "Incoming",
                        Quantity = product.StockQuantity,
                        TransactionDate = DateTime.UtcNow,
                        Reference = "Initial",
                        Note = "Automatic stock assignment on product creation",
                        CreatedById = userId
                    });
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.InnerException?.Message ?? ex.Message}");
            }

            // Log Action
            var username = User.Identity?.Name ?? "Unknown";
            await _auditLog.LogAsync(username, "Create", "Product", product.Id.ToString(), $"Added product: {product.Name}");

            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
        }

        // PUT: api/Products/5
        [HasPermission(AppPermissions.Inventory_ManageProducts)]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutProduct(Guid id, [FromBody] Product productDto)
        {
            if (id != productDto.Id)
            {
                return BadRequest("ID mismatch");
            }

            var existingProduct = await _context.Products.FindAsync(id);
            if (existingProduct == null)
            {
                return NotFound();
            }

            // Update properties
            existingProduct.Name = productDto.Name;
            existingProduct.NameEn = productDto.NameEn;
            existingProduct.SKU = productDto.SKU;
            existingProduct.Category = productDto.Category;
            existingProduct.Price = productDto.Price;
            
            if (string.IsNullOrWhiteSpace(productDto.Barcode))
            {
                existingProduct.Barcode = await GenerateUniqueBarcode();
            }
            else
            {
                existingProduct.Barcode = productDto.Barcode;
            }

            existingProduct.StockQuantity = productDto.StockQuantity;
            existingProduct.MinStockLevel = productDto.MinStockLevel;
            existingProduct.UpdatedAt = DateTime.UtcNow;

            try
            {
                // Handle Warehouse update if provided
                if (productDto.WarehouseId.HasValue && productDto.WarehouseId != Guid.Empty)
                {
                    var existingStockLevel = await _context.StockLevels
                        .FirstOrDefaultAsync(sl => sl.ProductId == id);

                    if (existingStockLevel != null)
                    {
                        if (existingStockLevel.WarehouseId != productDto.WarehouseId.Value)
                        {
                            existingStockLevel.WarehouseId = productDto.WarehouseId.Value;
                            existingStockLevel.Quantity = productDto.StockQuantity;
                            // No need for manual state modification
                        }
                    }
                    else
                    {
                        // Add new stock level if it didn't exist before
                        _context.StockLevels.Add(new StockLevel
                        {
                            Id = Guid.NewGuid(),
                            ProductId = id,
                            WarehouseId = productDto.WarehouseId.Value,
                            Quantity = productDto.StockQuantity,
                            BinLocation = "Assigned on Update"
                        });
                    }
                }

                await _context.SaveChangesAsync();
                
                // Log Action
                var username = User.Identity?.Name ?? "Unknown";
                await _auditLog.LogAsync(username, "Update", "Product", id.ToString(), $"Updated product details: {existingProduct.Name}");
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // DELETE: api/Products/5
        [HasPermission(AppPermissions.Inventory_ManageProducts)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            var productName = product.Name;
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            // Log Action
            var username = User.Identity?.Name ?? "Unknown";
            await _auditLog.LogAsync(username, "Delete", "Product", id.ToString(), $"Deleted product: {productName}");

            return NoContent();
        }

        private bool ProductExists(Guid id)
        {
            return _context.Products.Any(e => e.Id == id);
        }
    }
}
