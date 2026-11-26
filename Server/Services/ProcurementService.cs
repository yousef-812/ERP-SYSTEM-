using ERP.Api.Data;
using ERP.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ERP.Api.Services
{
    public interface IProcurementService
    {
        Task<PurchaseOrder> CreatePOAsync(PurchaseOrder po);
        Task<PurchaseOrder> ReceivePOAsync(Guid poId); // Legacy
        Task<GoodsReceivedNote> CreateGRNAsync(GoodsReceivedNote grn); // New 3-Way Logic
    }

    public class ProcurementService : IProcurementService
    {
        private readonly AppDbContext _context;

        public ProcurementService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PurchaseOrder> CreatePOAsync(PurchaseOrder po)
        {
            if (string.IsNullOrEmpty(po.PONumber))
            {
                po.PONumber = $"PO-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";
            }

            if (po.Details != null && po.Details.Any())
            {
                po.TotalAmount = po.Details.Sum(d => d.Quantity * d.UnitPrice);
            }

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();
            return po;
        }

        public async Task<PurchaseOrder> ReceivePOAsync(Guid poId)
        {
            var po = await _context.PurchaseOrders
                .Include(p => p.Details)
                .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(p => p.Id == poId);

            if (po == null) throw new Exception("Purchase Order not found.");
            if (po.Status == "Received") throw new Exception("Purchase Order already received.");
            if (!po.WarehouseId.HasValue) throw new Exception("No warehouse assigned to this Purchase Order.");

            foreach (var detail in po.Details)
            {
                if (detail.Product != null)
                {
                    // 1. Update Global Stock (for compatibility)
                    detail.Product.StockQuantity += detail.Quantity;
                    
                    // 2. Update Warehouse-Specific Stock
                    var stockLevel = await _context.StockLevels
                        .FirstOrDefaultAsync(sl => sl.ProductId == detail.ProductId && sl.WarehouseId == po.WarehouseId.Value);

                    if (stockLevel == null)
                    {
                        stockLevel = new StockLevel
                        {
                            ProductId = detail.ProductId,
                            WarehouseId = po.WarehouseId.Value,
                            Quantity = detail.Quantity,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.StockLevels.Add(stockLevel);
                    }
                    else
                    {
                        stockLevel.Quantity += detail.Quantity;
                        stockLevel.UpdatedAt = DateTime.UtcNow;
                    }

                    // 3. Track Stock Movement
                    _context.StockMovements.Add(new StockMovement
                    {
                        ProductId = detail.ProductId,
                        SupplierId = po.SupplierId, // Added missing SupplierId
                        WarehouseId = po.WarehouseId.Value,
                        Type = MovementType.Receiving,
                        Quantity = detail.Quantity,
                        UnitCost = detail.UnitPrice,
                        Note = $"Received from PO: {po.PONumber}",
                        MovementDate = DateTime.UtcNow
                    });
                }
            }

            po.Status = "Received";
            po.ReceivedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return po;
        }

        public async Task<GoodsReceivedNote> CreateGRNAsync(GoodsReceivedNote grn)
        {
            if (string.IsNullOrEmpty(grn.GRNNumber))
                grn.GRNNumber = $"GRN-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";

            var po = await _context.PurchaseOrders.Include(p => p.Details).FirstOrDefaultAsync(p => p.Id == grn.PurchaseOrderId);
            if (po == null) throw new Exception("Purchase Order not found.");
            if (!po.WarehouseId.HasValue) throw new Exception("PO has no warehouse.");

            // 3-Way Matching Logic
            foreach (var detail in grn.Details)
            {
                var poDetail = po.Details.FirstOrDefault(d => d.ProductId == detail.ProductId);
                if (poDetail == null) throw new Exception($"Product {detail.ProductId} not in PO.");

                if (detail.QuantityReceived > poDetail.Quantity)
                    throw new Exception($"Quantity received ({detail.QuantityReceived}) exceeds PO ordered ({poDetail.Quantity}) for product {detail.ProductId}.");

                // Weighted Average Cost (WAC) Logic
                var product = await _context.Products.FindAsync(detail.ProductId);
                if (product != null)
                {
                    decimal currentTotalValue = product.StockQuantity * product.Price; // Price acts as cost for WAC here
                    decimal incomingTotalValue = detail.QuantityReceived * detail.UnitCost;
                    
                    int newTotalQuantity = product.StockQuantity + detail.QuantityReceived;
                    if (newTotalQuantity > 0)
                    {
                        product.Price = Math.Round((currentTotalValue + incomingTotalValue) / (decimal)newTotalQuantity, 2, MidpointRounding.AwayFromZero);
                        product.StockQuantity = newTotalQuantity;
                    }

                    // Update Location-Specific Stock
                    var stockLevel = await _context.StockLevels
                        .FirstOrDefaultAsync(sl => sl.ProductId == product.Id && sl.WarehouseId == po.WarehouseId.Value);

                    if (stockLevel == null)
                    {
                        stockLevel = new StockLevel
                        {
                            ProductId = product.Id,
                            WarehouseId = po.WarehouseId.Value,
                            Quantity = detail.QuantityReceived,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.StockLevels.Add(stockLevel);
                    }
                    else
                    {
                        stockLevel.Quantity += detail.QuantityReceived;
                        stockLevel.UpdatedAt = DateTime.UtcNow;
                    }

                    _context.StockMovements.Add(new StockMovement
                    {
                        ProductId = product.Id,
                        SupplierId = po.SupplierId, // Added missing SupplierId
                        WarehouseId = po.WarehouseId.Value,
                        Quantity = detail.QuantityReceived,
                        UnitCost = detail.UnitCost,
                        Type = MovementType.Receiving,
                        Note = $"GRN: {grn.GRNNumber} (PO: {po.PONumber})",
                        MovementDate = DateTime.UtcNow
                    });
                }
            }

            _context.GoodsReceivedNotes.Add(grn);
            
            // Mark PO as partially/fully received
            po.Status = "Received"; // Simplification for Stage 1
            
            await _context.SaveChangesAsync();
            return grn;
        }
    }
}
