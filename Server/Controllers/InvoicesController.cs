using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ERP.Api.Extensions;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class InvoicesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLog;
        private readonly IAccountingService _accounting;
        private readonly ITaxService _taxService;

        public InvoicesController(AppDbContext context, IAuditLogService auditLog, IAccountingService accounting, ITaxService taxService)
        {
            _context = context;
            _auditLog = auditLog;
            _accounting = accounting;
            _taxService = taxService;
        }

        // GET: api/Invoices
        [HasPermission(AppPermissions.Sales_ViewInvoices)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Invoice>>> GetInvoices()
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Invoices
                .Include(i => i.Order)
                    .ThenInclude(o => o.Customer)
                .Include(i => i.Order)
                    .ThenInclude(o => o.Warehouse)
                .AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();
                
                query = query.Where(i => i.Order.WarehouseId.HasValue && assignedWarehouseIds.Contains(i.Order.WarehouseId.Value));
            }

            return await query
                .OrderByDescending(i => i.InvoiceDate)
                .ToListAsync();
        }
        // GET: api/Invoices/v2?pageNumber=1&pageSize=10
        [HasPermission(AppPermissions.Sales_ViewInvoices)]
        [HttpGet("v2")]
        [ProducesResponseType(typeof(PagedResult<Invoice>), StatusCodes.Status200OK)]
        public async Task<ActionResult<PagedResult<Invoice>>> GetInvoicesV2([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Invoices
                .Include(i => i.Order)
                    .ThenInclude(o => o.Customer)
                .Include(i => i.Order)
                    .ThenInclude(o => o.Warehouse)
                .AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(i => i.Order.WarehouseId.HasValue && assignedWarehouseIds.Contains(i.Order.WarehouseId.Value));
            }

            return await query
                .OrderByDescending(i => i.InvoiceDate)
                .ToPagedListAsync(pageNumber, pageSize);
        }

        // GET: api/Invoices/{id}
        [HasPermission(AppPermissions.Sales_ViewInvoices)]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInvoice(Guid id)
        {
            // 1. Fetch Invoice with Order and Customer info
            var invoice = await _context.Invoices
                .Include(i => i.Order)
                    .ThenInclude(o => o.Customer)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null) return NotFound();

            // 2. Load Details for this Order
            var details = await _context.OrderDetails
                .Include(d => d.Product)
                .Where(d => d.OrderId == invoice.OrderId)
                .ToListAsync();

            // 3. Map details to a rich item set
            var invoiceItems = details.Select(d => new {
                productId = d.ProductId,
                quantity = d.Quantity,
                unitPrice = d.UnitPrice,
                productName = d.Product?.Name ?? "General Item",
                productNameEn = d.Product?.NameEn ?? d.Product?.Name ?? "General Item",
                category = d.Product?.Category
            }).ToList();

            // 4. Return full details for Tax Invoice view
            return Ok(new {
                id = invoice.Id,
                invoiceNumber = invoice.InvoiceNumber,
                invoiceDate = invoice.InvoiceDate,
                paymentStatus = (int)invoice.PaymentStatus,
                amount = invoice.Amount,
                subtotal = invoice.Amount,
                taxPercentage = invoice.TaxPercentage,
                totalTax = invoice.TotalTaxAmount,
                totalAmount = invoice.TotalAmountInclTax,
                qrCode = invoice.TlvBase64String, // TLV for ZATCA
                orderId = invoice.OrderId,
                orderStatus = (int?)(invoice.Order?.Status),
                isCreditNote = invoice.Order?.Status == OrderStatus.Returned,
                customer = invoice.Order?.Customer != null ? new {
                    name = invoice.Order.Customer.Name,
                    nameEn = invoice.Order.Customer.NameEn,
                    phone = invoice.Order.Customer.Phone,
                    address = invoice.Order.Customer.Address,
                    email = invoice.Order.Customer.Email
                } : null,
                invoice_items = invoiceItems,  // Legacy key
                items = invoiceItems          // Modern key
            });
        }

        // PUT: api/Invoices/{id}
        // Advanced editing: Updates Invoice, OrderDetails, and corrects Stock
        [HasPermission(AppPermissions.Sales_CreateInvoices)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] UpdateInvoiceDto dto)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Order)
                    .ThenInclude(o => o.Details)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (invoice == null)
                return NotFound("Invoice not found.");

            if (invoice.PaymentStatus == PaymentStatus.Paid)
                return BadRequest("Paid invoices cannot be edited.");

            // 0. Duplicate Invoice Number Check
            if (await _context.Invoices.AnyAsync(i => i.InvoiceNumber == dto.InvoiceNumber && i.Id != id))
            {
                return BadRequest($"Invoice number '{dto.InvoiceNumber}' is already in use by another invoice.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Better Identity Extraction
                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                  ?? User.FindFirst("id")?.Value 
                                  ?? User.FindFirst("sub")?.Value;
                
                var fallbackUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin" || u.Role == "Admin") 
                                  ?? await _context.Users.OrderBy(u => u.CreatedAt).FirstOrDefaultAsync();
                
                Guid currentUserId = Guid.Empty;
                if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var parsedId))
                {
                    if (await _context.Users.AnyAsync(u => u.Id == parsedId))
                    {
                        currentUserId = parsedId;
                    }
                }
                
                if (currentUserId == Guid.Empty)
                {
                    currentUserId = fallbackUser?.Id ?? Guid.Empty;
                }

                // If still empty and there's a constraint, we might need to handle this. 
                // However, having a valid currentUserId is critical for enterprise auditing.

                var targetWarehouseId = invoice.Order.WarehouseId ?? (await _context.Warehouses.Select(w => w.Id).FirstOrDefaultAsync());

                // 1. (Removed previous stock reversal, stock only deducted at payment)

                // 2. Clear old Details
                var existingDetails = invoice.Order.Details.ToList();
                foreach (var detail in existingDetails)
                {
                    _context.Entry(detail).State = EntityState.Detached;
                }

                await _context.Database.ExecuteSqlInterpolatedAsync($"DELETE FROM OrderDetails WHERE OrderId = {invoice.OrderId}");

                // 3. Process New Items (Validation only, no deduction)
                decimal totalAmount = 0;

                foreach (var item in dto.Items)
                {
                    var product = await _context.Products.Include(p => p.StockLevels).FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    if (product == null)
                        return BadRequest($"Product {item.ProductId} not found.");

                    var subtotal = item.Quantity * item.UnitPrice;
                    totalAmount += subtotal;

                    var newDetail = new OrderDetail
                    {
                        Id = Guid.NewGuid(),
                        OrderId = invoice.OrderId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = item.UnitPrice
                    };
                    _context.OrderDetails.Add(newDetail);
                }

                // 4. Update Entities
                invoice.InvoiceNumber = dto.InvoiceNumber;
                invoice.InvoiceDate = dto.InvoiceDate;
                invoice.Amount = totalAmount;

                _taxService.CalculateInvoiceTax(invoice);

                var sellerName = (await _context.Settings.FirstOrDefaultAsync(s => s.Key == "CompanyName"))?.Value ?? "ERP System Core";
                var vatNumber = (await _context.Settings.FirstOrDefaultAsync(s => s.Key == "VatNumber"))?.Value ?? "300000000000003";
                invoice.TlvBase64String = _taxService.GetZatcaTlv(invoice, sellerName, vatNumber);

                invoice.Order.TotalAmount = invoice.TotalAmountInclTax;
                invoice.Order.TaxAmount = invoice.TotalTaxAmount;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var username = User.Identity?.Name ?? fallbackUser?.Username ?? "Unknown";
                await _auditLog.LogAsync(username, "Update", "Invoice", invoice.Id.ToString(), $"Updated details for Invoice: {invoice.InvoiceNumber}");

                return Ok(new { message = "Invoice and Order updated successfully." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.WriteLine($"[UpdateInvoice Error] {ex.Message}");
                return StatusCode(500, $"An error occurred: {ex.Message}");
            }
        }

        // POST: api/Invoices/{id}/pay
        [HasPermission(AppPermissions.Sales_CreateInvoices)]
        [HttpPost("{id}/pay")]
        public async Task<IActionResult> PayInvoice(Guid id)
        {
            try 
            {
                var invoice = await _context.Invoices
                    .Include(i => i.Order)
                    .FirstOrDefaultAsync(i => i.Id == id);

                if (invoice == null)
                    return NotFound("Invoice not found.");

                if (invoice.PaymentStatus == PaymentStatus.Paid)
                    return BadRequest("Invoice is already paid.");

                // Start a robust Database Transaction
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // 0. Identity Detection for Audit
                    var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                      ?? User.FindFirst("id")?.Value 
                                      ?? User.FindFirst("sub")?.Value;
                    
                    var fallbackUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin" || u.Role == "Admin") 
                                      ?? await _context.Users.OrderBy(u => u.CreatedAt).FirstOrDefaultAsync();

                    Guid currentUserId = Guid.Empty;
                    if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var parsedId))
                    {
                        if (await _context.Users.AnyAsync(u => u.Id == parsedId))
                        {
                            currentUserId = parsedId;
                        }
                    }

                    if (currentUserId == Guid.Empty)
                    {
                        currentUserId = fallbackUser?.Id ?? Guid.Empty;
                    }

                    // 1. Update Invoice Status
                    invoice.PaymentStatus = PaymentStatus.Paid;

                    // 2. Update Order Status (Safe Check)
                    if (invoice.Order != null)
                    {
                        invoice.Order.Status = OrderStatus.Paid;

                        // 2b. DEDUCT STOCK (Moved from CreateOrder to here)
                        // Fetch order details with products and stock levels
                        var orderDetails = await _context.OrderDetails
                            .Include(d => d.Product)
                                .ThenInclude(p => p.StockLevels)
                            .Where(d => d.OrderId == invoice.OrderId)
                            .ToListAsync();

                        var warehouseId = invoice.Order.WarehouseId ?? (await _context.Warehouses.Select(w => w.Id).FirstOrDefaultAsync());

                        foreach (var detail in orderDetails)
                        {
                            if (detail.Product != null)
                            {
                                // Deduct from Global stock
                                detail.Product.StockQuantity -= detail.Quantity;

                                // Deduct from Warehouse stock
                                var stockLevel = detail.Product.StockLevels.FirstOrDefault(sl => sl.WarehouseId == warehouseId);
                                if (stockLevel != null)
                                {
                                    stockLevel.Quantity -= detail.Quantity;
                                }

                                // Record Inventory Transaction
                                _context.InventoryTransactions.Add(new InventoryTransaction
                                {
                                    Id = Guid.NewGuid(),
                                    ProductId = detail.ProductId,
                                    WarehouseId = warehouseId,
                                    Type = "Outgoing",
                                    Quantity = detail.Quantity,
                                    TransactionDate = DateTime.UtcNow,
                                    Reference = invoice.InvoiceNumber,
                                    Note = $"Sale from Paid Invoice",
                                    CreatedById = currentUserId != Guid.Empty ? currentUserId : (fallbackUser?.Id ?? Guid.Empty)
                                });

                                // Record Stock Movement for Audit
                                _context.StockMovements.Add(new StockMovement
                                {
                                    Id = Guid.NewGuid(),
                                    ProductId = detail.ProductId,
                                    Quantity = -detail.Quantity,
                                    UnitCost = detail.UnitPrice,
                                    Type = MovementType.Sale,
                                    MovementDate = DateTime.UtcNow,
                                    WarehouseId = warehouseId,
                                    Note = $"Order #{invoice.Order.Id.ToString().Substring(0,8)}",
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }
                    }

                    // 3. Create a Financial Transaction record
                    bool isReturn = invoice.InvoiceNumber.StartsWith("RTN-") || invoice.Order?.Status == OrderStatus.Returned;
                    
                    var financialTransaction = new FinancialTransaction
                    {
                        Id = Guid.NewGuid(),
                        Type = isReturn ? TransactionType.Expense : TransactionType.Revenue,
                        Amount = invoice.TotalAmountInclTax,
                        Date = DateTime.UtcNow,
                        Description = isReturn 
                            ? $"Refund processed for Return Invoice: {invoice.InvoiceNumber}" 
                            : $"Payment received (Incl. Tax) for Invoice: {invoice.InvoiceNumber}",
                        RelatedEntityId = invoice.Id,
                        WarehouseId = invoice.Order?.WarehouseId, // Link financial transaction to warehouse
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.FinancialTransactions.Add(financialTransaction);

                    // 4. Digital Ledger Entries with Robust Account Selection
                    var receivablesAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "1100" || (a.Type == "Asset" && a.Name.Contains("Receivable")))
                        ?? new Account { Id = Guid.NewGuid(), Name = "Accounts Receivable", Type = "Asset", AccountCode = "1100", CreatedAt = DateTime.UtcNow };

                    var revenueAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "4000" || a.Type == "Revenue") 
                        ?? new Account { Id = Guid.NewGuid(), Name = "Sales Revenue", Type = "Revenue", AccountCode = "4000", CreatedAt = DateTime.UtcNow };
                    
                    var cashAccount = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == "1000" || (a.Type == "Asset" && a.Name.Contains("Cash")))
                        ?? new Account { Id = Guid.NewGuid(), Name = "Cash", Type = "Asset", AccountCode = "1000", CreatedAt = DateTime.UtcNow };

                    if (_context.Entry(receivablesAccount).State == EntityState.Detached) _context.Accounts.Add(receivablesAccount);
                    if (_context.Entry(revenueAccount).State == EntityState.Detached) _context.Accounts.Add(revenueAccount);
                    if (_context.Entry(cashAccount).State == EntityState.Detached) _context.Accounts.Add(cashAccount);

                    await _context.SaveChangesAsync();

                    // 5. Post to General Ledger (Revenue Recognition at Payment)
                    var ledgerLines = isReturn 
                        ? new List<(Guid AccountId, decimal Debit, decimal Credit)>
                          {
                              (revenueAccount.Id, invoice.TotalAmountInclTax, 0),    // Debit Revenue (Decrease)
                              (cashAccount.Id, 0, invoice.TotalAmountInclTax)       // Credit Cash (Decrease)
                          }
                        : new List<(Guid AccountId, decimal Debit, decimal Credit)>
                          {
                              (cashAccount.Id, invoice.TotalAmountInclTax, 0),      // Debit Cash (Increase)
                              (revenueAccount.Id, 0, invoice.TotalAmountInclTax)    // Credit Revenue (Increase)
                          };

                    await _accounting.PostJournalEntryAsync(
                        invoice.InvoiceNumber, 
                        isReturn ? $"Refund for Return {invoice.InvoiceNumber}" : $"Revenue Recognition: Invoice {invoice.InvoiceNumber}",
                        "EGP", 
                        ledgerLines,
                        DateTime.UtcNow,
                        invoice.Order?.WarehouseId // Pass warehouse for P&L tracking
                    );

                    await transaction.CommitAsync();

                    // 6. Log Payment Action
                    var username = User.Identity?.Name ?? fallbackUser?.Username ?? "Unknown";
                    await _auditLog.LogAsync(username, "Pay", "Invoice", invoice.Id.ToString(), $"Processed payment for Invoice: {invoice.InvoiceNumber}");

                    return Ok(new { message = "Payment processed successfully.", invoiceId = invoice.Id });
                }
                catch (Exception ex)
                {
                    if (transaction != null) await transaction.RollbackAsync();
                    Console.WriteLine($"Transaction Error in PayInvoice: {ex.Message}");
                    return StatusCode(500, $"An error occurred: {ex.Message} {(ex.InnerException != null ? " | Inner: " + ex.InnerException.Message : "")}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Top-level Error in PayInvoice: {ex.Message}");
                return StatusCode(500, $"A critical error occurred: {ex.Message}");
            }
        }
    }
}
