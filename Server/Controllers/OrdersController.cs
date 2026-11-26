using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using ERP.Api.DTOs;
using ERP.Api.Services;
using Microsoft.AspNetCore.Authorization;
using ERP.Api.Authorization;

namespace ERP.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ITaxService _taxService;
        private readonly IAccountingService _accounting;
        public OrdersController(AppDbContext context, ITaxService taxService, IAccountingService accounting)
        {
            _context = context;
            _taxService = taxService;
            _accounting = accounting;
        }

        // GET: api/Orders
        [HasPermission(AppPermissions.Sales_ViewOrders, AppPermissions.Sales_IssueDelivery)]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Warehouse)
                .Include(o => o.Details)
                    .ThenInclude(d => d.Product)
                .AsQueryable();

            if (userRole != "Admin" && Guid.TryParse(userIdStr, out var userId))
            {
                var assignedWarehouseIds = await _context.UserWarehouses
                    .Where(uw => uw.UserId == userId)
                    .Select(uw => uw.WarehouseId)
                    .ToListAsync();

                query = query.Where(o => o.WarehouseId.HasValue && assignedWarehouseIds.Contains(o.WarehouseId.Value));
            }

            return await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
        }

        // POST: api/Orders
        // The Core Sales Engine (Transactional POS)
        [HasPermission(AppPermissions.Sales_CreateInvoices)]
        [HttpPost]
        public async Task<ActionResult<Order>> CreateOrder(CreateOrderDto orderDto)
        {
            if (orderDto.Items == null || !orderDto.Items.Any())
                return BadRequest("Order must contain at least one item.");

            var customer = await _context.Customers.FindAsync(orderDto.CustomerId);
            if (customer == null)
                return BadRequest("Invalid Customer.");

            // 0. Preliminary Stock Validation (Hard Block for non-quotations)
            // Note: Detailed warehouse-level validation happens inside the transaction loop below.

            // Start a robust Database Transaction
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // 1. Identity & Warehouse Context Detection
                var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                
                Guid currentUserId = Guid.Empty;
                if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var pId)) currentUserId = pId;

                // Determine effective WarehouseId
                Guid selectedWarehouseId = Guid.Empty;
                if (userRole == "Admin")
                {
                    selectedWarehouseId = orderDto.WarehouseId ?? (await _context.Warehouses.Select(w => w.Id).FirstOrDefaultAsync());
                }
                else
                {
                    var assignedWarehouses = await _context.UserWarehouses
                        .Where(uw => uw.UserId == currentUserId)
                        .Select(uw => uw.WarehouseId)
                        .ToListAsync();

                    if (orderDto.WarehouseId.HasValue)
                    {
                        if (!assignedWarehouses.Contains(orderDto.WarehouseId.Value))
                            return Forbid("You do not have permission to sell from this warehouse.");
                        selectedWarehouseId = orderDto.WarehouseId.Value;
                    }
                    else
                    {
                        selectedWarehouseId = assignedWarehouses.FirstOrDefault();
                        if (selectedWarehouseId == Guid.Empty)
                            return BadRequest("User is not assigned to any warehouse.");
                    }
                }

                var vatSetting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == "VatPercentage");
                decimal vatPercentage = vatSetting != null ? decimal.Parse(vatSetting.Value) : 0;

                decimal subtotalAmount = 0;
                var orderDetails = new List<OrderDetail>();

                // 2. Process items and validate stock
                foreach (var item in orderDto.Items)
                {
                    // 2. Validate items (No deduction here, happens at Payment)
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        return BadRequest($"Product with ID {item.ProductId} not found.");

                    int quantityToDeduct = item.Quantity;

                    if (!orderDto.IsQuotation)
                    {
                        // Validate specific warehouse stock
                        var stockLevel = await _context.StockLevels
                            .FirstOrDefaultAsync(s => s.ProductId == product.Id && s.WarehouseId == selectedWarehouseId);
                        
                        if (stockLevel == null || stockLevel.Quantity < quantityToDeduct)
                        {
                            return BadRequest(new { 
                                error = "insufficient_warehouse_stock", 
                                productName = product.Name,
                                warehouseId = selectedWarehouseId,
                                available = stockLevel?.Quantity ?? 0, 
                                requested = quantityToDeduct 
                            });
                        }
                        // Note: We DO NOT deduct here anymore. 
                        // It will be deducted in InvoicesController.PayInvoice
                    }

                    // Calculate subtotal for what we CAN fulfill now
                    subtotalAmount += quantityToDeduct * item.UnitPrice;

                    orderDetails.Add(new OrderDetail
                    {
                        Id = Guid.NewGuid(),
                        ProductId = item.ProductId,
                        Quantity = quantityToDeduct,
                        UnitPrice = item.UnitPrice,
                    });
                }

                // 3. Calculate Tax and Total
                decimal taxAmount = subtotalAmount * (vatPercentage / 100);
                decimal totalAmount = subtotalAmount + taxAmount;

                // 4. Create the Order (Quotation or Real Order)
                var order = new Order
                {
                    Id = Guid.NewGuid(),
                    CustomerId = orderDto.CustomerId,
                    OrderDate = DateTime.UtcNow,
                    TotalAmount = totalAmount,
                    TaxAmount = taxAmount,
                    Status = orderDto.IsQuotation ? OrderStatus.Quotation : OrderStatus.Pending,
                    IsQuotation = orderDto.IsQuotation,
                    QuotationNumber = orderDto.IsQuotation ? $"QTN-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}" : null,
                    ValidUntil = orderDto.IsQuotation ? DateTime.UtcNow.AddDays(15) : null,
                    CreatedAt = DateTime.UtcNow,
                    Details = orderDetails,
                    WarehouseId = selectedWarehouseId
                };

                _context.Orders.Add(order);

                // 5. Create Invoice & Ledger ONLY if it's a real Order
                if (!order.IsQuotation)
                {
                    var invoice = new Invoice
                    {
                        Id = Guid.NewGuid(),
                        OrderId = order.Id,
                        InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                        InvoiceDate = DateTime.UtcNow,
                        Amount = subtotalAmount,
                        TaxPercentage = vatPercentage,
                        PaymentStatus = PaymentStatus.Unpaid,
                        CreatedAt = DateTime.UtcNow,
                        DueDate = DateTime.UtcNow.AddDays(30),

                    };

                    _taxService.CalculateInvoiceTax(invoice);
                    
                    var sellerName = (await _context.Settings.FirstOrDefaultAsync(s => s.Key == "CompanyName"))?.Value ?? "ERP System Core";
                    var vatNumber = (await _context.Settings.FirstOrDefaultAsync(s => s.Key == "VatNumber"))?.Value ?? "300000000000003";
                    invoice.TlvBase64String = _taxService.GetZatcaTlv(invoice, sellerName, vatNumber);

                    _context.Invoices.Add(invoice);

                    // 6. Record in Customer Ledger (Debit)
                    var currentBalance = await _context.CustomerLedgers
                        .Where(l => l.CustomerId == order.CustomerId)
                        .OrderByDescending(l => l.CreatedAt)
                        .Select(l => l.BalanceAfter)
                        .FirstOrDefaultAsync();

                    _context.CustomerLedgers.Add(new CustomerLedger
                    {
                        CustomerId = order.CustomerId,
                        EntryType = LedgerEntryType.Invoice,
                        Debit = invoice.TotalAmountInclTax,
                        Credit = 0,
                        BalanceAfter = currentBalance + invoice.TotalAmountInclTax,
                        Description = $"Invoice {invoice.InvoiceNumber} generated for Order {order.Id}",
                        RelatedEntityId = invoice.Id,
                        TransactionDate = DateTime.UtcNow
                    });

                // 6. (Removed Revenue Recognition from GL here, moved to InvoicesController.PayInvoice to calculate profit only after payment)
                }

                // 4. (Removed Stock Movement recording here, moved to InvoicesController.PayInvoice)

                // 5. Save and Commit
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, order);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var innerMessage = ex.InnerException != null ? $" | Inner: {ex.InnerException.Message}" : "";
                Console.WriteLine($"[OrdersController] Error: {ex.Message}{innerMessage}");
                return StatusCode(500, $"An error occurred while creating the order: {ex.Message}{innerMessage}");
            }
        }
        
        [HasPermission(AppPermissions.Sales_ViewOrders, AppPermissions.Sales_IssueDelivery)]
        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(Guid id)
        {
            Console.WriteLine($"[OrdersController] Fetching Order ID: {id}");
            var order = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.Warehouse)
                .Include(o => o.Details)
                    .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound();

            return order;
        }

        [HasPermission(AppPermissions.Sales_IssueDelivery)]
        [HttpPost("{id}/ship")]
        public async Task<IActionResult> ShipOrder(Guid id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            if (order.Status == OrderStatus.Shipped)
                return BadRequest("Order is already shipped.");

            order.Status = OrderStatus.Shipped;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Order marked as shipped successfully" });
        }

        // POST: api/Orders/{id}/return
        [HasPermission(AppPermissions.Sales_CreateInvoices)]
        [HttpPost("{id}/return")]
        public async Task<IActionResult> ReturnOrder(Guid id, [FromBody] ReturnOrderDto returnDto)
        {
            if (id != returnDto.OrderId)
                return BadRequest("Order ID mismatch.");

            var order = await _context.Orders
                .Include(o => o.Details)
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound("Order not found.");

            // Find the original invoice to get the tax percentage used at the time of sale
            var originalInvoice = await _context.Invoices
                .Where(i => i.OrderId == id)
                .OrderBy(i => i.CreatedAt)
                .FirstOrDefaultAsync();

            decimal originalTaxPercentage = originalInvoice?.TaxPercentage ?? 15.0m;

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var fallbackUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin" || u.Role == "Admin") 
                                  ?? await _context.Users.OrderBy(u => u.CreatedAt).FirstOrDefaultAsync();
                
                Guid currentUserId = Guid.Empty;
                if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var parsedId))
                {
                    // Verify the user exists in the current DB to avoid FK violations
                    var userExists = await _context.Users.AnyAsync(u => u.Id == parsedId);
                    if (userExists) currentUserId = parsedId;
                }
                
                if (currentUserId == Guid.Empty && fallbackUser != null)
                {
                    currentUserId = fallbackUser.Id;
                }
                
                decimal returnSubtotal = 0;
                var returnedItemsCount = 0;

                // 1. Process Return Items
                foreach (var returnItem in returnDto.Items)
                {
                    if (returnItem.ReturnQuantity <= 0) continue;

                    var orderDetail = order.Details.FirstOrDefault(d => d.ProductId == returnItem.ProductId);
                    if (orderDetail == null)
                        return BadRequest($"Product {returnItem.ProductId} was not part of this order.");

                    int remainingToReturn = orderDetail.Quantity - orderDetail.ReturnedQuantity;
                    if (returnItem.ReturnQuantity > remainingToReturn)
                        return BadRequest($"Cannot return {returnItem.ReturnQuantity} of {orderDetail.ProductId}. Only {remainingToReturn} remaining.");

                    // Update Returned Quantity state
                    orderDetail.ReturnedQuantity += returnItem.ReturnQuantity;
                    returnSubtotal += returnItem.ReturnQuantity * orderDetail.UnitPrice;
                    returnedItemsCount++;

                    // 2. Restore Stock
                    var product = await _context.Products.Include(p => p.StockLevels).FirstOrDefaultAsync(p => p.Id == returnItem.ProductId);
                    if (product != null)
                    {
                        product.StockQuantity += returnItem.ReturnQuantity;

                        // Find the stock level for the specific warehouse this order was made from
                        var targetWarehouseId = order.WarehouseId ?? (await _context.Warehouses.Select(w => w.Id).FirstOrDefaultAsync());
                        var stockLevel = product.StockLevels.FirstOrDefault(sl => sl.WarehouseId == targetWarehouseId);

                        if (stockLevel != null)
                        {
                            stockLevel.Quantity += returnItem.ReturnQuantity;
                        }
                        else
                        {
                            // Create stock level for that warehouse if missing
                            stockLevel = new StockLevel
                            {
                                ProductId = product.Id,
                                WarehouseId = targetWarehouseId,
                                Quantity = returnItem.ReturnQuantity,
                                UpdatedAt = DateTime.UtcNow
                            };
                            _context.StockLevels.Add(stockLevel);
                        }

                        // 3. Record Stock Movement (Incoming Return)
                        _context.StockMovements.Add(new StockMovement
                        {
                            Id = Guid.NewGuid(),
                            ProductId = returnItem.ProductId,
                            Quantity = returnItem.ReturnQuantity,
                            Type = MovementType.Return,
                            MovementDate = DateTime.UtcNow,
                            WarehouseId = targetWarehouseId,
                            Note = $"Partial Return for Order #{order.Id.ToString().Substring(0, 8)}. Reason: {returnDto.Reason}",
                            CreatedAt = DateTime.UtcNow
                        });

                        // 4. Log Inventory Transaction
                        _context.InventoryTransactions.Add(new InventoryTransaction
                        {
                            Id = Guid.NewGuid(),
                            ProductId = product.Id,
                            WarehouseId = targetWarehouseId,
                            Type = "Return",
                            Quantity = returnItem.ReturnQuantity,
                            TransactionDate = DateTime.UtcNow,
                            Reference = $"RTN-{order.Id.ToString().Substring(0, 8)}",
                            Note = $"Partial return: {returnDto.Reason}",
                            CreatedById = currentUserId
                        });
                    }
                }

                if (returnedItemsCount == 0)
                    return BadRequest("No items were specified for return.");

                // 5. Create Credit Note (Invoice)
                decimal returnTaxAmount = returnSubtotal * (originalTaxPercentage / 100);
                decimal returnTotalAmount = returnSubtotal + returnTaxAmount;

                var creditNote = new Invoice
                {
                    Id = Guid.NewGuid(),
                    OrderId = order.Id,
                    InvoiceNumber = $"RTN-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}",
                    InvoiceDate = DateTime.UtcNow,
                    Amount = returnSubtotal,
                    TaxPercentage = originalTaxPercentage,
                    TotalTaxAmount = returnTaxAmount,
                    TotalAmountInclTax = returnTotalAmount,
                    PaymentStatus = PaymentStatus.Unpaid, // User wants to confirm payment manually
                    CreatedAt = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow
                };

                // Generate QR Code for Credit Note
                var sellerName = (await _context.Settings.FirstOrDefaultAsync(s => s.Key == "CompanyName"))?.Value ?? "ERP System Core";
                var vatNumber = (await _context.Settings.FirstOrDefaultAsync(s => s.Key == "VatNumber"))?.Value ?? "300000000000003";
                creditNote.TlvBase64String = _taxService.GetZatcaTlv(creditNote, sellerName, vatNumber);

                _context.Invoices.Add(creditNote);

                // 6. Update Customer Ledger (Credit Entry)
                var currentBalance = await _context.CustomerLedgers
                    .Where(l => l.CustomerId == order.CustomerId)
                    .OrderByDescending(l => l.CreatedAt)
                    .Select(l => l.BalanceAfter)
                    .FirstOrDefaultAsync();

                _context.CustomerLedgers.Add(new CustomerLedger
                {
                    CustomerId = order.CustomerId,
                    EntryType = LedgerEntryType.Refund,
                    Debit = 0,
                    Credit = returnTotalAmount,
                    BalanceAfter = currentBalance - returnTotalAmount,
                    Description = $"Credit Note {creditNote.InvoiceNumber} for return of Order {order.Id.ToString().Substring(0,8)}",
                    RelatedEntityId = creditNote.Id,
                    TransactionDate = DateTime.UtcNow
                });

                // 7. Check if order is now fully returned
                bool allReturned = order.Details.All(d => d.ReturnedQuantity >= d.Quantity);
                if (allReturned)
                {
                    order.Status = OrderStatus.Returned;
                }
                
                Console.WriteLine($"[DEBUG] Processing Return for Order: {order.Id}");
                Console.WriteLine($"[DEBUG] CustomerId: {order.CustomerId}");
                Console.WriteLine($"[DEBUG] currentUserId: {currentUserId}");
                Console.WriteLine($"[DEBUG] ReturnedItemsCount: {returnedItemsCount}");
                Console.WriteLine($"[DEBUG] CreditNote Number: {creditNote.InvoiceNumber}");
                Console.WriteLine($"[DEBUG] CreditNote Id: {creditNote.Id}");
                
                // Final Check on FKs for sub-entities
                foreach (var entry in _context.ChangeTracker.Entries())
                {
                    if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
                    {
                        Console.WriteLine($"[DEBUG] Saving {entry.Entity.GetType().Name}. State: {entry.State}");
                        if (entry.Entity is InventoryTransaction it) Console.WriteLine($"   InventoryTrans: Product={it.ProductId}, Warehouse={it.WarehouseId}, User={it.CreatedById}");
                        if (entry.Entity is Invoice inv) Console.WriteLine($"   Invoice: Order={inv.OrderId}");
                        if (entry.Entity is CustomerLedger cl) Console.WriteLine($"   Ledger: Customer={cl.CustomerId}");
                        if (entry.Entity is StockMovement sm) Console.WriteLine($"   Movement: Product={sm.ProductId}");
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Partial return processed successfully", creditNoteNumber = creditNote.InvoiceNumber });
            }
            catch (DbUpdateException dbEx)
            {
                await transaction.RollbackAsync();
                var innerMsg = dbEx.InnerException?.Message ?? dbEx.Message;
                Console.WriteLine($"[OrdersController] DB Update Error: {innerMsg}");
                return StatusCode(500, $"Database error: {innerMsg}");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var innerMessage = ex.InnerException != null ? $" | Inner: {ex.InnerException.Message}" : "";
                return StatusCode(500, $"Error processing return: {ex.Message}{innerMessage}");
            }
        }
    }
}
